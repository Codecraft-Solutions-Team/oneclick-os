#!/usr/bin/env node
/**
 * Manage OneClick OS beta testers, staff allowlists, and signup invite codes
 * in Firestore & Firebase Auth (project: codecraft-sol).
 *
 * Run `node tools/manage-beta-testers.mjs --help` for usage.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_PROJECT = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'codecraft-sol';

const USAGE = `OneClick OS Beta Tester, Staff & Invite Manager

Usage:
  node tools/manage-beta-testers.mjs <group> <command> [args] [options]

Commands:
  tester add <email-or-uid> [--label "Note"] [--no-claim]
      Allow a user on the beta dashboard and /beta board.
      Works even before the user creates their account (pre-approved by email).

  tester remove <email-or-uid>
      Remove beta tester access from Firestore and clear betaTester claim if present.

  tester list
      List all entries in betaTesters.

  staff add <email-or-uid> [--role "triage"] [--name "Display Name"]
      Grant OneClick team status in oneclickStaff/{uid} and set staff: true claim.

  staff remove <email-or-uid>
      Remove OneClick team status from oneclickStaff/{uid} and clear staff claim.

  staff list
      List all entries in oneclickStaff.

  invite create <code> [--label "Early testers"] [--max-uses 25]
      Create a signup invite code in supportInvites/{code} (needed when OPEN_SIGNUPS = false).

  invite list
      List all signup invite codes in supportInvites.

  invite set-active <code> <true|false>
      Enable or disable an invite code.

  invite remove <code>
      Delete an invite code from supportInvites.

Options:
  --project <id>    Firebase project ID (default: ${DEFAULT_PROJECT})
  -h, --help        Show this help message

Environment:
  GOOGLE_APPLICATION_CREDENTIALS   Path to service account JSON for live project
  FIRESTORE_EMULATOR_HOST          e.g. 127.0.0.1:8080 for local Firestore emulator
  FIREBASE_AUTH_EMULATOR_HOST      e.g. 127.0.0.1:9099 for local Auth emulator
`;

function loadAdminSdk() {
  const req = createRequire(import.meta.url);
  const candidates = [
    'firebase-admin',
    resolve(REPO_ROOT, 'functions/node_modules/firebase-admin'),
  ];
  for (const mod of candidates) {
    try {
      if (mod.startsWith('/') && !existsSync(mod)) continue;
      return req(mod);
    } catch {
      // try next resolution path
    }
  }
  throw new Error(
    'Could not find firebase-admin. Run "npm install" inside functions/ first.'
  );
}

function parseCli(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      flags.help = true;
    } else if (arg === '--no-claim') {
      flags.noClaim = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, flags };
}

async function resolveAuthUser(auth, identifier) {
  try {
    if (identifier.includes('@')) {
      return await auth.getUserByEmail(identifier.toLowerCase());
    }
    return await auth.getUser(identifier);
  } catch (err) {
    if (err && err.code === 'auth/user-not-found') return null;
    throw err;
  }
}

async function mergeCustomClaim(auth, uid, patch) {
  const user = await auth.getUser(uid);
  const next = { ...(user.customClaims || {}), ...patch };
  for (const [k, v] of Object.entries(next)) {
    if (v === undefined || v === null) delete next[k];
  }
  await auth.setCustomUserClaims(uid, next);
}

async function handleTester(db, auth, admin, sub, args, flags) {
  const FieldValue = admin.firestore.FieldValue;

  if (sub === 'list') {
    const snap = await db.collection('betaTesters').get();
    if (snap.empty) {
      console.log('No entries in betaTesters.');
      return;
    }
    for (const doc of snap.docs) {
      const d = doc.data();
      console.log(`${doc.id}\tactive=${d.active !== false}\tlabel=${d.label || '-'}`);
    }
    return;
  }

  const target = (args[0] || '').trim();
  if (!target) throw new Error(`Missing <email-or-uid> for tester ${sub}.`);
  const isEmail = target.includes('@');
  const docId = isEmail ? target.toLowerCase() : target;

  if (sub === 'add') {
    const payload = {
      active: true,
      addedBy: 'cli',
      addedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (isEmail) payload.email = docId;
    else payload.uid = docId;
    if (typeof flags.label === 'string' && flags.label.trim()) {
      payload.label = flags.label.trim().slice(0, 120);
    }
    await db.collection('betaTesters').doc(docId).set(payload, { merge: true });
    console.log(`Added betaTesters/${docId}`);

    if (!flags.noClaim) {
      try {
        const user = await resolveAuthUser(auth, target);
        if (user) {
          await mergeCustomClaim(auth, user.uid, { betaTester: true });
          console.log(`Set betaTester=true claim on Auth user ${user.uid}`);
        } else {
          console.log('No Auth user yet for that identifier; allowlist doc will grant access when they sign in.');
        }
      } catch (err) {
        console.warn(`Warning: could not update Auth claim (${err.message}). Firestore allowlist was saved.`);
      }
    }
    return;
  }

  if (sub === 'remove') {
    await db.collection('betaTesters').doc(docId).delete();
    console.log(`Removed betaTesters/${docId}`);
    try {
      const user = await resolveAuthUser(auth, target);
      if (user) {
        await mergeCustomClaim(auth, user.uid, { betaTester: undefined });
        console.log(`Cleared betaTester claim on Auth user ${user.uid}`);
      }
    } catch (err) {
      console.warn(`Warning: could not update Auth claim (${err.message}).`);
    }
    return;
  }

  throw new Error(`Unknown tester command "${sub}". Run with --help.`);
}

async function handleStaff(db, auth, admin, sub, args, flags) {
  const FieldValue = admin.firestore.FieldValue;

  if (sub === 'list') {
    const snap = await db.collection('oneclickStaff').get();
    if (snap.empty) {
      console.log('No entries in oneclickStaff.');
      return;
    }
    for (const doc of snap.docs) {
      const d = doc.data();
      console.log(`${doc.id}\tactive=${d.active !== false}\trole=${d.role || '-'}\tname=${d.displayName || '-'}`);
    }
    return;
  }

  const target = (args[0] || '').trim();
  if (!target) throw new Error(`Missing <email-or-uid> for staff ${sub}.`);

  const user = await resolveAuthUser(auth, target);
  const uid = user ? user.uid : (target.includes('@') ? null : target);
  if (!uid) {
    throw new Error(`Auth user not found for ${target}. Staff must already have an Auth account (or pass a UID).`);
  }

  if (sub === 'add') {
    const payload = {
      active: true,
      addedBy: 'cli',
      addedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof flags.role === 'string' && flags.role.trim()) {
      payload.role = flags.role.trim().slice(0, 40);
    }
    if (typeof flags.name === 'string' && flags.name.trim()) {
      payload.displayName = flags.name.trim().slice(0, 60);
    }
    await db.collection('oneclickStaff').doc(uid).set(payload, { merge: true });
    console.log(`Added oneclickStaff/${uid}`);
    if (user) {
      await mergeCustomClaim(auth, uid, { staff: true });
      console.log(`Set staff=true claim on Auth user ${uid}`);
    }
    return;
  }

  if (sub === 'remove') {
    await db.collection('oneclickStaff').doc(uid).delete();
    console.log(`Removed oneclickStaff/${uid}`);
    if (user) {
      await mergeCustomClaim(auth, uid, { staff: undefined });
      console.log(`Cleared staff claim on Auth user ${uid}`);
    }
    return;
  }

  throw new Error(`Unknown staff command "${sub}". Run with --help.`);
}

async function handleInvite(db, sub, args, flags) {
  if (sub === 'list') {
    const snap = await db.collection('supportInvites').get();
    if (snap.empty) {
      console.log('No invite codes in supportInvites.');
      return;
    }
    for (const doc of snap.docs) {
      const d = doc.data();
      console.log(`${doc.id}\tactive=${d.active}\tuses=${d.uses}/${d.maxUses}\tlabel=${d.label}`);
    }
    return;
  }

  const code = (args[0] || '').trim();
  if (code.length < 3 || code.length > 64) {
    throw new Error('Invite <code> must be 3..64 characters.');
  }

  if (sub === 'create') {
    const label = String(flags.label || 'Beta invite').trim().slice(0, 120);
    const maxUses = Number.parseInt(String(flags['max-uses'] || '25'), 10);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000) {
      throw new Error('--max-uses must be an integer between 1 and 100000.');
    }
    await db.collection('supportInvites').doc(code).set({
      active: true,
      label,
      maxUses,
      uses: 0,
    });
    console.log(`Created supportInvites/${code} (maxUses=${maxUses}, label="${label}")`);
    return;
  }

  if (sub === 'set-active') {
    const rawBool = String(args[1] || '').toLowerCase();
    if (rawBool !== 'true' && rawBool !== 'false') {
      throw new Error('Usage: invite set-active <code> <true|false>');
    }
    await db.collection('supportInvites').doc(code).update({ active: rawBool === 'true' });
    console.log(`Updated supportInvites/${code} active=${rawBool}`);
    return;
  }

  if (sub === 'remove') {
    await db.collection('supportInvites').doc(code).delete();
    console.log(`Deleted supportInvites/${code}`);
    return;
  }

  throw new Error(`Unknown invite command "${sub}". Run with --help.`);
}

async function main() {
  const { positionals, flags } = parseCli(process.argv.slice(2));
  if (flags.help || positionals.length === 0) {
    console.log(USAGE);
    return;
  }

  const [group, sub, ...rest] = positionals;
  if (!group || !sub) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const admin = loadAdminSdk();
  const projectId = typeof flags.project === 'string' && flags.project.trim()
    ? flags.project.trim()
    : DEFAULT_PROJECT;

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }
  const db = admin.firestore();
  const auth = admin.auth();

  if (group === 'tester') {
    await handleTester(db, auth, admin, sub, rest, flags);
  } else if (group === 'staff') {
    await handleStaff(db, auth, admin, sub, rest, flags);
  } else if (group === 'invite') {
    await handleInvite(db, sub, rest, flags);
  } else {
    throw new Error(`Unknown command group "${group}". Expected tester, staff, or invite.`);
  }
}

main().catch((err) => {
  console.error(`Error: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
