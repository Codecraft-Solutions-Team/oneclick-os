import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '../../firestore.rules');
const PROJECT_ID = 'codecraft-sol';

const [emulatorHost, emulatorPortRaw] = (
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
).split(':');
const emulatorPort = Number(emulatorPortRaw || 8080);

/** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
let testEnv;

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
}

function userDb(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore();
}

function ownerDb() {
  return userDb('codecraft-owner', { email: 'admin@codecraftsol.org' });
}

function staffClaimDb(uid = 'staff-1') {
  return userDb(uid, { email: `${uid}@codecraftsol.org`, staff: true });
}

function baseReport(overrides = {}) {
  return {
    authorUid: 'alice',
    authorName: 'Alice',
    isTeam: false,
    title: 'Wi-Fi drops after sleep on ThinkPad',
    what: 'After waking from suspend the Wi-Fi icon vanishes until reboot.',
    expected: 'Wi-Fi reconnects automatically within a few seconds.',
    pc: 'ThinkPad T14 Gen 2',
    version: '44.20261113.0',
    category: 'settings',
    status: 'new',
    sameCount: 1,
    replyCount: 0,
    hasTeamReply: false,
    lastTeamReplyAt: null,
    hidden: false,
    deleted: false,
    flagCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastReplyAt: serverTimestamp(),
    ...overrides,
  };
}

function baseReply(overrides = {}) {
  return {
    authorUid: 'bob',
    authorName: 'Bob',
    isTeam: false,
    body: 'Same card here, restarting NetworkManager brings it back.',
    hidden: false,
    deleted: false,
    flagCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function baseBetaPost(overrides = {}) {
  return {
    authorUid: 'tester1',
    authorName: 'Tester One',
    isTeam: false,
    title: 'Installer ISO checksum check on USB',
    body: 'Booted cleanly on AMD desktop and verified desktop scaling at 150%.',
    version: '44.20261113.0',
    pc: 'Ryzen 5 5600 / RX 6600',
    replyCount: 0,
    hidden: false,
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

before(async () => {
  setLogLevel('error');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Existing Codecraft production rules preservation', () => {
  it('enforces /users/{uid} member-only self-create, name-only self-update, owner full control', async () => {
    const alice = userDb('alice', { email: 'alice@example.com' });
    const bob = userDb('bob', { email: 'bob@example.com' });
    const owner = ownerDb();

    await assertSucceeds(
      setDoc(doc(alice, 'users/alice'), { role: 'member', name: 'Alice' })
    );
    await assertFails(
      setDoc(doc(bob, 'users/bob'), { role: 'client', name: 'Bob' })
    );
    await assertFails(
      setDoc(doc(bob, 'users/bob'), { role: 'owner', name: 'Bob' })
    );

    await assertSucceeds(
      updateDoc(doc(alice, 'users/alice'), { name: 'Alice A.' })
    );
    await assertFails(
      updateDoc(doc(alice, 'users/alice'), { role: 'client' })
    );
    await assertFails(getDoc(doc(bob, 'users/alice')));

    await assertSucceeds(getDoc(doc(owner, 'users/alice')));
    await assertSucceeds(
      updateDoc(doc(owner, 'users/alice'), { role: 'client' })
    );
    await assertFails(deleteDoc(doc(alice, 'users/alice')));
    await assertSucceeds(deleteDoc(doc(owner, 'users/alice')));
  });

  it('enforces /bookings, /inquiries, /messages, /projects, /portfolio, /settings', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });
    const bob = userDb('bob', { email: 'bob@example.com' });
    const owner = ownerDb();

    // bookings
    await assertSucceeds(
      setDoc(doc(alice, 'bookings/b1'), { accountId: 'alice', slot: 'mon' })
    );
    await assertFails(
      setDoc(doc(alice, 'bookings/b2'), { accountId: 'bob', slot: 'mon' })
    );
    await assertFails(getDoc(doc(alice, 'bookings/b1')));
    await assertSucceeds(getDoc(doc(owner, 'bookings/b1')));

    // inquiries
    await assertSucceeds(
      setDoc(doc(anon, 'inquiries/inq1'), {
        name: 'Visitor',
        email: 'v@example.com',
        message: 'Hello',
        createdAt: Date.now(),
      })
    );
    await assertFails(
      setDoc(doc(anon, 'inquiries/inq2'), {
        name: 'Visitor',
        email: 'not-an-email',
        message: 'Hello',
        createdAt: Date.now(),
      })
    );
    await assertFails(getDoc(doc(anon, 'inquiries/inq1')));
    await assertSucceeds(getDoc(doc(owner, 'inquiries/inq1')));

    // messages
    await assertSucceeds(
      setDoc(doc(alice, 'messages/m1'), {
        threadId: 'alice',
        from: 'client',
        body: 'Hi',
      })
    );
    await assertFails(
      setDoc(doc(alice, 'messages/m2'), {
        threadId: 'alice',
        from: 'owner',
        body: 'Spoof',
      })
    );
    await assertSucceeds(getDoc(doc(alice, 'messages/m1')));
    await assertFails(getDoc(doc(bob, 'messages/m1')));

    // projects
    await assertSucceeds(
      setDoc(doc(alice, 'projects/p1'), { clientId: 'alice', title: 'Site' })
    );
    await assertSucceeds(getDoc(doc(alice, 'projects/p1')));
    await assertFails(updateDoc(doc(alice, 'projects/p1'), { title: 'Edit' }));
    await assertSucceeds(updateDoc(doc(owner, 'projects/p1'), { title: 'Edit' }));

    // portfolio & settings
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'portfolio/item1'), { title: 'Showcase' });
      await setDoc(doc(db, 'settings/promo'), { active: true });
      await setDoc(doc(db, 'settings/internal'), { key: 'secret' });
    });
    await assertSucceeds(getDoc(doc(anon, 'portfolio/item1')));
    await assertFails(setDoc(doc(alice, 'portfolio/item2'), { title: 'No' }));
    await assertSucceeds(getDoc(doc(anon, 'settings/promo')));
    await assertFails(getDoc(doc(anon, 'settings/internal')));
    await assertFails(getDoc(doc(owner, 'settings/internal')));
    await assertSucceeds(setDoc(doc(owner, 'settings/promo'), { active: false }));
    await assertFails(setDoc(doc(alice, 'settings/promo'), { active: true }));
  });

  it('enforces /nonprofits, /nonprofitApplications, /supportMessages, /adminNotifications, /licences, and /oneclick_reports', async () => {
    const anon = anonDb();
    const org1 = userDb('org1', { email: 'org1@example.org' });
    const org2 = userDb('org2', { email: 'org2@example.org' });
    const owner = ownerDb();

    await assertSucceeds(
      setDoc(doc(anon, 'nonprofitApplications/app1'), {
        fullName: 'Jane Doe',
        email: 'jane@charity.org',
        orgName: 'Helping Hands',
        hasWebsite: false,
        websiteUrl: '',
        helpOptions: ['website'],
        otherText: '',
        hasSocial: false,
        facebookUrl: '',
        instagramUrl: '',
        status: 'pending',
        createdAt: Date.now(),
      })
    );
    await assertFails(
      setDoc(doc(anon, 'nonprofitApplications/app2'), {
        fullName: 'Jane Doe',
        email: 'jane@charity.org',
        orgName: 'Helping Hands',
        status: 'approved',
        createdAt: Date.now(),
      })
    );

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'nonprofits/np1'), { uid: 'org1', name: 'Org 1' });
      await setDoc(doc(db, 'supportMessages/sm1'), { orgUid: 'org1', text: 'Help' });
      await setDoc(doc(db, 'adminNotifications/n1'), { read: false, msg: 'Alert' });
      await setDoc(doc(db, 'licences/lic1'), { notes: 'internal' });
      await setDoc(doc(db, 'passwordSetTokens/tok1'), { hash: 'abc' });
      await setDoc(doc(db, 'oneclick_reports/r1'), { email: 'priv@example.com' });
    });

    await assertSucceeds(getDoc(doc(org1, 'nonprofits/np1')));
    await assertFails(getDoc(doc(org2, 'nonprofits/np1')));
    await assertFails(setDoc(doc(org1, 'nonprofits/np2'), { uid: 'org1' }));

    await assertSucceeds(getDoc(doc(org1, 'supportMessages/sm1')));
    await assertFails(getDoc(doc(org2, 'supportMessages/sm1')));
    await assertFails(setDoc(doc(org1, 'supportMessages/sm2'), { orgUid: 'org1' }));

    await assertSucceeds(updateDoc(doc(owner, 'adminNotifications/n1'), { read: true }));
    await assertFails(updateDoc(doc(owner, 'adminNotifications/n1'), { msg: 'changed' }));
    await assertFails(updateDoc(doc(org1, 'adminNotifications/n1'), { read: true }));

    await assertFails(getDoc(doc(org1, 'licences/lic1')));
    await assertSucceeds(getDoc(doc(owner, 'licences/lic1')));

    await assertFails(getDoc(doc(owner, 'passwordSetTokens/tok1')));
    await assertFails(getDoc(doc(owner, 'oneclick_reports/r1')));
    await assertFails(setDoc(doc(org1, 'oneclick_reports/r2'), { what: 'spoof' }));
  });
});

describe('OneClick Staff & Beta Testers allowlists', () => {
  it('protects /oneclickStaff from non-owner writes and restricts reads/listing', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });
    const noEmailUser = userDb('noemail');
    const staff = staffClaimDb('staff-1');
    const owner = ownerDb();

    // Non-owner cannot create staff (not even existing staff!)
    await assertFails(setDoc(doc(anon, 'oneclickStaff/alice'), { active: true }));
    await assertFails(setDoc(doc(alice, 'oneclickStaff/alice'), { active: true }));
    await assertFails(setDoc(doc(staff, 'oneclickStaff/alice'), { active: true }));

    // Owner creates staff doc
    await assertSucceeds(
      setDoc(doc(owner, 'oneclickStaff/alice'), {
        active: true,
        role: 'triage',
        displayName: 'Alice Staff',
        addedAt: serverTimestamp(),
      })
    );

    // Self can get own doc; user without email can check own nonexistent doc without error
    await assertSucceeds(getDoc(doc(alice, 'oneclickStaff/alice')));
    await assertSucceeds(getDoc(doc(noEmailUser, 'oneclickStaff/noemail')));

    // Regular user cannot get someone else's doc or list oneclickStaff
    await assertFails(getDoc(doc(noEmailUser, 'oneclickStaff/alice')));
    await assertFails(getDocs(collection(noEmailUser, 'oneclickStaff')));

    // Staff (via doc or claim) can list oneclickStaff
    await assertSucceeds(getDocs(collection(alice, 'oneclickStaff')));
    await assertSucceeds(getDocs(collection(staff, 'oneclickStaff')));
  });

  it('protects /betaTesters list from non-staff and allows email-keyed self-get (case-insensitive, verified only)', async () => {
    const alice = userDb('alice', { email: 'Alice@Example.com', email_verified: true });
    const bob = userDb('bob', { email: 'bob@example.com', email_verified: true });
    const staff = staffClaimDb('staff-1');

    // Non-staff cannot write or list betaTesters
    await assertFails(setDoc(doc(alice, 'betaTesters/alice'), { active: true }));
    await assertFails(setDoc(doc(alice, 'betaTesters/alice@example.com'), { active: true }));
    await assertFails(getDocs(collection(alice, 'betaTesters')));

    // Staff adds tester by lowercase email and by UID
    await assertSucceeds(
      setDoc(doc(staff, 'betaTesters/alice@example.com'), {
        active: true,
        email: 'alice@example.com',
        addedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      setDoc(doc(staff, 'betaTesters/bob-uid-doc'), {
        active: true,
        uid: 'bob-uid-doc',
        addedAt: serverTimestamp(),
      })
    );

    // Alice (mixed-case email in token) can get her own email doc, cannot get bob's or list all testers
    await assertSucceeds(getDoc(doc(alice, 'betaTesters/alice@example.com')));
    await assertFails(getDoc(doc(alice, 'betaTesters/bob-uid-doc')));
    await assertFails(getDocs(collection(alice, 'betaTesters')));
    await assertFails(getDoc(doc(bob, 'betaTesters/alice@example.com')));

    // Staff can list and delete betaTesters
    await assertSucceeds(getDocs(collection(staff, 'betaTesters')));
    await assertSucceeds(deleteDoc(doc(staff, 'betaTesters/bob-uid-doc')));
  });

  it('denies staff actions when oneclickStaff/{uid} has active: false (while allowing omitted active)', async () => {
    const inactiveStaff = userDb('inactive-staff', {
      email: 'inactive-staff@example.com',
      email_verified: true,
    });
    const legacyActiveStaff = userDb('legacy-staff', {
      email: 'legacy-staff@example.com',
      email_verified: true,
    });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'oneclickStaff/inactive-staff'), {
        active: false,
        role: 'triage',
        addedAt: now,
      });
      await setDoc(doc(db, 'oneclickStaff/legacy-staff'), {
        role: 'triage',
        addedAt: now,
      });
      await setDoc(doc(db, 'betaTesters/t1'), { active: true, uid: 't1', addedAt: now });
      await setDoc(doc(db, 'supportFlags/f1'), {
        targetPath: 'supportReports/r1',
        reason: 'Spam',
        reporterUid: 'alice',
        status: 'open',
        createdAt: now,
      });
      await setDoc(doc(db, 'supportInvites/INV1'), {
        active: true,
        label: 'Early',
        maxUses: 10,
        uses: 0,
      });
      await setDoc(
        doc(db, 'supportReports/r1'),
        baseReport({ createdAt: now, updatedAt: now, lastReplyAt: now })
      );
      await setDoc(
        doc(db, 'supportReports/r-hidden'),
        baseReport({ hidden: true, createdAt: now, updatedAt: now, lastReplyAt: now })
      );
      await setDoc(doc(db, 'betaNotes/bn1'), {
        title: 'Build 44.20261113.0',
        body: 'Test notes.',
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'betaPosts/bp1'), baseBetaPost({ createdAt: now, updatedAt: now }));
      await setDoc(doc(db, 'betaChecks/t1_wifi'), {
        uid: 't1',
        item: 'Wi-Fi',
        status: 'works',
        updatedAt: now,
      });
    });

    // User can read their own staff status doc so the client UI can inspect active flag
    await assertSucceeds(getDoc(doc(inactiveStaff, 'oneclickStaff/inactive-staff')));

    // Inactive staff is denied all staff actions and staff-implied beta access
    await assertFails(getDoc(doc(inactiveStaff, 'oneclickStaff/legacy-staff')));
    await assertFails(getDocs(collection(inactiveStaff, 'oneclickStaff')));
    await assertFails(getDocs(collection(inactiveStaff, 'betaTesters')));
    await assertFails(setDoc(doc(inactiveStaff, 'betaTesters/newt'), { active: true }));
    await assertFails(deleteDoc(doc(inactiveStaff, 'betaTesters/t1')));
    await assertFails(getDoc(doc(inactiveStaff, 'supportFlags/f1')));
    await assertFails(getDocs(collection(inactiveStaff, 'supportFlags')));
    await assertFails(updateDoc(doc(inactiveStaff, 'supportFlags/f1'), { status: 'resolved' }));
    await assertFails(getDocs(collection(inactiveStaff, 'supportInvites')));
    await assertFails(
      setDoc(doc(inactiveStaff, 'supportInvites/INV2'), {
        active: true,
        label: 'Denied',
        maxUses: 5,
        uses: 0,
      })
    );
    await assertFails(getDoc(doc(inactiveStaff, 'supportReports/r-hidden')));
    await assertFails(getDocs(collection(inactiveStaff, 'supportReports')));
    await assertFails(
      updateDoc(doc(inactiveStaff, 'supportReports/r1'), {
        status: 'fixed',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(inactiveStaff, 'betaNotes/bn2'), {
        title: 'Denied note',
        body: 'Should fail',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(inactiveStaff, 'betaNotes/bn1'), {
        pinned: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(inactiveStaff, 'betaNotes/bn1')));
    await assertFails(getDoc(doc(inactiveStaff, 'betaPosts/bp1')));
    await assertFails(getDoc(doc(inactiveStaff, 'betaNotes/bn1')));
    await assertFails(getDoc(doc(inactiveStaff, 'betaChecks/t1_wifi')));

    // Legacy staff doc omitting `active` still grants staff access
    await assertSucceeds(getDocs(collection(legacyActiveStaff, 'betaTesters')));
    await assertSucceeds(getDoc(doc(legacyActiveStaff, 'supportFlags/f1')));
  });
});

describe('/supportInvites/{code}', () => {
  it('allows single-code get without listing, restricts writes to staff except +1 uses increment', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });
    const staff = staffClaimDb();

    await assertFails(
      setDoc(doc(alice, 'supportInvites/BETA2026'), {
        active: true,
        label: 'Early',
        maxUses: 10,
        uses: 0,
      })
    );

    // Rejects email field even from staff
    await assertFails(
      setDoc(doc(staff, 'supportInvites/BADCODE'), {
        active: true,
        label: 'Early',
        maxUses: 10,
        uses: 0,
        email: 'leak@example.com',
      })
    );

    await assertSucceeds(
      setDoc(doc(staff, 'supportInvites/BETA2026'), {
        active: true,
        label: 'Early testers',
        maxUses: 2,
        uses: 0,
      })
    );

    // Anyone can validate a known code via get, but cannot list all codes
    await assertSucceeds(getDoc(doc(anon, 'supportInvites/BETA2026')));
    await assertFails(getDocs(collection(anon, 'supportInvites')));
    await assertFails(getDocs(collection(alice, 'supportInvites')));
    await assertSucceeds(getDocs(collection(staff, 'supportInvites')));

    // Unauthenticated user cannot increment uses
    await assertFails(
      updateDoc(doc(anon, 'supportInvites/BETA2026'), { uses: increment(1) })
    );

    // Signed-in user cannot tamper with maxUses/active or jump by +2
    await assertFails(
      updateDoc(doc(alice, 'supportInvites/BETA2026'), { uses: 2 })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportInvites/BETA2026'), {
        uses: increment(1),
        maxUses: 999,
      })
    );

    // Valid +1 uses increments up to maxUses (2), then fails
    await assertSucceeds(
      updateDoc(doc(alice, 'supportInvites/BETA2026'), { uses: increment(1) })
    );
    await assertSucceeds(
      updateDoc(doc(alice, 'supportInvites/BETA2026'), { uses: increment(1) })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportInvites/BETA2026'), { uses: increment(1) })
    );

    // Inactive invite cannot be incremented
    await assertSucceeds(
      updateDoc(doc(staff, 'supportInvites/BETA2026'), {
        active: false,
        maxUses: 10,
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportInvites/BETA2026'), { uses: increment(1) })
    );
  });
});

describe('/supportAccountMeta/{uid}', () => {
  it('enforces self-only writes, rejects privilege escalation/PII/oversized strings, protects privacy', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });
    const bob = userDb('bob', { email: 'bob@example.com' });
    const staff = staffClaimDb();

    await assertSucceeds(
      setDoc(doc(alice, 'supportAccountMeta/alice'), {
        displayName: 'Alice',
        osVersion: '44.20261113.0',
        lastSeenRepliesAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      })
    );

    // Bob and anon cannot read or write Alice's metadata
    await assertFails(getDoc(doc(anon, 'supportAccountMeta/alice')));
    await assertFails(getDoc(doc(bob, 'supportAccountMeta/alice')));
    await assertFails(
      updateDoc(doc(bob, 'supportAccountMeta/alice'), { displayName: 'Hacked' })
    );
    await assertFails(deleteDoc(doc(bob, 'supportAccountMeta/alice')));

    // Privilege escalation & schema pollution & length limits rejected
    await assertFails(
      setDoc(doc(alice, 'supportAccountMeta/alice'), {
        displayName: 'Alice',
        staff: true,
      })
    );
    await assertFails(
      setDoc(doc(alice, 'supportAccountMeta/alice'), {
        displayName: 'Alice',
        betaTester: true,
      })
    );
    await assertFails(
      setDoc(doc(alice, 'supportAccountMeta/alice'), {
        displayName: 'Alice',
        email: 'alice@example.com',
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportAccountMeta/alice'), {
        displayName: 'A'.repeat(61),
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportAccountMeta/alice'), {
        osVersion: '4'.repeat(41),
      })
    );

    // Staff can read; self can delete
    await assertSucceeds(getDoc(doc(staff, 'supportAccountMeta/alice')));
    await assertSucceeds(deleteDoc(doc(alice, 'supportAccountMeta/alice')));
  });
});

describe('/supportRateLimits/{uid} & /supportReports/{reportId} creation/cooldown', () => {
  it('requires atomic rate-limit batch on create and enforces 10s cooldown across create and update', async () => {
    const alice = userDb('alice', { email: 'alice@example.com' });
    const bob = userDb('bob', { email: 'bob@example.com' });
    const staff = staffClaimDb();

    // Direct report create without supportRateLimits batch fails
    await assertFails(
      setDoc(doc(alice, 'supportReports/r-nobatch'), baseReport())
    );

    // Atomic batch (initial create of supportRateLimits/alice + supportReports/r1) succeeds
    const batch1 = writeBatch(alice);
    batch1.set(doc(alice, 'supportRateLimits/alice'), {
      lastPostAt: serverTimestamp(),
    });
    batch1.set(doc(alice, 'supportReports/r1'), baseReport());
    await assertSucceeds(batch1.commit());

    // Immediate second batch (< 10s cooldown) fails atomically
    const batch2 = writeBatch(alice);
    batch2.set(doc(alice, 'supportRateLimits/alice'), {
      lastPostAt: serverTimestamp(),
    });
    batch2.set(doc(alice, 'supportReports/r2'), baseReport({ title: 'Second quick post' }));
    await assertFails(batch2.commit());
    await assertFails(getDoc(doc(alice, 'supportReports/r2')));

    // Cannot spoof timestamp on rate limit
    await assertFails(
      setDoc(doc(bob, 'supportRateLimits/bob'), {
        lastPostAt: Timestamp.fromMillis(Date.now() - 60000),
      })
    );

    // After > 10s (simulated via admin seed), update of supportRateLimits + create report succeeds!
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'supportRateLimits/alice'), {
        lastPostAt: Timestamp.fromMillis(Date.now() - 15000),
      });
    });
    const batch3 = writeBatch(alice);
    batch3.set(doc(alice, 'supportRateLimits/alice'), {
      lastPostAt: serverTimestamp(),
    });
    batch3.set(doc(alice, 'supportReports/r3'), baseReport({ title: 'After cooldown report' }));
    await assertSucceeds(batch3.commit());

    // Staff can post official report with isTeam: true
    await assertSucceeds(
      setDoc(
        doc(staff, 'supportReports/r-team'),
        baseReport({
          authorUid: 'staff-1',
          authorName: 'OneClick Team',
          isTeam: true,
          title: 'Known Wi-Fi sleep issue in build 44',
        })
      )
    );
  });

  it('blocks spoofing, PII injection, DoS payloads, and invalid initial fields on /supportReports create', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });

    await assertFails(
      setDoc(doc(anon, 'supportReports/r-anon'), baseReport({ authorUid: 'anon' }))
    );

    const tryBatchCreate = (reportOverrides) => {
      const b = writeBatch(alice);
      b.set(doc(alice, 'supportRateLimits/alice'), { lastPostAt: serverTimestamp() });
      b.set(doc(alice, 'supportReports/r-bad'), baseReport(reportOverrides));
      return b.commit();
    };

    await assertFails(tryBatchCreate({ authorUid: 'bob' }));
    await assertFails(tryBatchCreate({ isTeam: true }));
    await assertFails(tryBatchCreate({ status: 'fixed' }));
    await assertFails(tryBatchCreate({ sameCount: 99 }));
    await assertFails(tryBatchCreate({ replyCount: 5 }));
    await assertFails(tryBatchCreate({ hasTeamReply: true }));
    await assertFails(tryBatchCreate({ hidden: true }));
    await assertFails(tryBatchCreate({ deleted: true }));
    await assertFails(tryBatchCreate({ flagCount: 1 }));
    await assertFails(tryBatchCreate({ email: 'alice@example.com' }));
    await assertFails(tryBatchCreate({ category: 'not-a-category' }));
    await assertFails(tryBatchCreate({ title: 'ab' }));
    await assertFails(tryBatchCreate({ title: 'x'.repeat(161) }));
    await assertFails(tryBatchCreate({ what: 'tiny' }));
    await assertFails(tryBatchCreate({ what: 'w'.repeat(4001) }));
    await assertFails(
      tryBatchCreate({ createdAt: Timestamp.fromMillis(Date.now() - 86400000) })
    );
  });
});

describe('/supportReports/{reportId} read, query, edit, anonymize, moderation, votes, and replies', () => {
  it('enforces hidden-post read protection, query alignment, author edits, anonymization, and staff moderation', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });
    const bob = userDb('bob', { email: 'bob@example.com' });
    const staff = staffClaimDb();

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'supportReports/pub1'), baseReport({ createdAt: now, updatedAt: now, lastReplyAt: now }));
      await setDoc(
        doc(db, 'supportReports/hid1'),
        baseReport({ hidden: true, createdAt: now, updatedAt: now, lastReplyAt: now })
      );
    });

    // Public query with where('hidden', '==', false) works; unfiltered query fails for non-staff
    await assertSucceeds(getDoc(doc(anon, 'supportReports/pub1')));
    await assertFails(getDoc(doc(anon, 'supportReports/hid1')));
    await assertSucceeds(
      getDocs(
        query(
          collection(anon, 'supportReports'),
          where('hidden', '==', false),
          orderBy('createdAt', 'desc')
        )
      )
    );
    await assertFails(getDocs(collection(anon, 'supportReports')));
    await assertSucceeds(getDocs(collection(staff, 'supportReports')));
    await assertSucceeds(getDoc(doc(staff, 'supportReports/hid1')));

    // Bob cannot edit or delete or anonymize Alice's report
    await assertFails(
      updateDoc(doc(bob, 'supportReports/pub1'), {
        title: 'Bob hijacked',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(bob, 'supportReports/pub1')));

    // Alice can edit allowed fields only, cannot change status/isTeam/hidden/sameCount/createdAt
    await assertSucceeds(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        title: 'Wi-Fi drops after suspend on ThinkPad T14',
        version: '44.20261114.0',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        status: 'fixed',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        hidden: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        isTeam: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        what: 'w'.repeat(4001),
        updatedAt: serverTimestamp(),
      })
    );

    // Staff can moderate status and hidden, cannot forge sameCount
    await assertSucceeds(
      updateDoc(doc(staff, 'supportReports/pub1'), {
        status: 'looking',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(staff, 'supportReports/pub1'), {
        sameCount: 500,
        updatedAt: serverTimestamp(),
      })
    );

    // Author can anonymize / soft-delete own report; afterwards cannot edit it back
    await assertSucceeds(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        what: '[deleted]',
        expected: '',
        pc: '',
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(alice, 'supportReports/pub1'), {
        title: 'Restore after delete',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('enforces 1-vote-per-user atomic batch on votes/{uid} and sameCount', async () => {
    const anon = anonDb();
    const bob = userDb('bob', { email: 'bob@example.com' });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'supportReports/r1'), baseReport({ createdAt: now, updatedAt: now, lastReplyAt: now }));
      await setDoc(
        doc(db, 'supportReports/r-hidden'),
        baseReport({ hidden: true, createdAt: now, updatedAt: now, lastReplyAt: now })
      );
    });

    // Cannot inflate sameCount without creating votes/bob
    await assertFails(
      updateDoc(doc(bob, 'supportReports/r1'), {
        sameCount: increment(1),
        updatedAt: serverTimestamp(),
      })
    );

    // Cannot create orphaned vote or vote on hidden report
    await assertFails(
      setDoc(doc(bob, 'supportReports/does-not-exist/votes/bob'), {
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(bob, 'supportReports/r-hidden/votes/bob'), {
        createdAt: serverTimestamp(),
      })
    );

    // Atomic vote batch succeeds
    const voteBatch = writeBatch(bob);
    voteBatch.set(doc(bob, 'supportReports/r1/votes/bob'), {
      createdAt: serverTimestamp(),
    });
    voteBatch.update(doc(bob, 'supportReports/r1'), {
      sameCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(voteBatch.commit());
    await assertSucceeds(getDoc(doc(anon, 'supportReports/r1/votes/bob')));

    // Double vote fails
    const doubleVoteBatch = writeBatch(bob);
    doubleVoteBatch.set(doc(bob, 'supportReports/r1/votes/bob'), {
      createdAt: serverTimestamp(),
    });
    doubleVoteBatch.update(doc(bob, 'supportReports/r1'), {
      sameCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    await assertFails(doubleVoteBatch.commit());

    // Cannot update vote doc directly
    await assertFails(
      updateDoc(doc(bob, 'supportReports/r1/votes/bob'), {
        createdAt: serverTimestamp(),
      })
    );

    // Atomic unvote batch succeeds
    const unvoteBatch = writeBatch(bob);
    unvoteBatch.delete(doc(bob, 'supportReports/r1/votes/bob'));
    unvoteBatch.update(doc(bob, 'supportReports/r1'), {
      sameCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(unvoteBatch.commit());

    // Unvoting again fails (vote no longer exists)
    const secondUnvote = writeBatch(bob);
    secondUnvote.delete(doc(bob, 'supportReports/r1/votes/bob'));
    secondUnvote.update(doc(bob, 'supportReports/r1'), {
      sameCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    await assertFails(secondUnvote.commit());
  });

  it('enforces reply creation, team reply restriction, author edit/anonymize, and staff moderation', async () => {
    const anon = anonDb();
    const bob = userDb('bob', { email: 'bob@example.com' });
    const carol = userDb('carol', { email: 'carol@example.com' });
    const staff = staffClaimDb();

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'supportReports/r1'), baseReport({ createdAt: now, updatedAt: now, lastReplyAt: now }));
    });

    // Orphaned reply fails
    await assertFails(
      setDoc(doc(bob, 'supportReports/missing/replies/rep1'), baseReply())
    );

    // Bob cannot spoof isTeam or hasTeamReply
    await assertFails(
      setDoc(doc(bob, 'supportReports/r1/replies/rep-spoof'), baseReply({ isTeam: true }))
    );
    const spoofBatch = writeBatch(bob);
    spoofBatch.set(doc(bob, 'supportReports/r1/replies/rep1'), baseReply());
    spoofBatch.update(doc(bob, 'supportReports/r1'), {
      replyCount: increment(1),
      lastReplyAt: serverTimestamp(),
      hasTeamReply: true,
      updatedAt: serverTimestamp(),
    });
    await assertFails(spoofBatch.commit());

    // Valid non-team reply batch succeeds
    const replyBatch = writeBatch(bob);
    replyBatch.set(doc(bob, 'supportReports/r1/replies/rep1'), baseReply());
    replyBatch.update(doc(bob, 'supportReports/r1'), {
      replyCount: increment(1),
      lastReplyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(replyBatch.commit());
    await assertSucceeds(
      getDocs(
        query(
          collection(anon, 'supportReports/r1/replies'),
          where('hidden', '==', false),
          orderBy('createdAt', 'asc')
        )
      )
    );

    // Carol cannot edit or delete Bob's reply
    await assertFails(
      updateDoc(doc(carol, 'supportReports/r1/replies/rep1'), {
        body: 'Tampered',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(carol, 'supportReports/r1/replies/rep1')));

    // Bob can edit own reply body, then anonymize it
    await assertSucceeds(
      updateDoc(doc(bob, 'supportReports/r1/replies/rep1'), {
        body: 'Updated workaround: systemctl restart NetworkManager.',
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(bob, 'supportReports/r1/replies/rep1'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        body: '[deleted]',
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );

    // Staff can post official team reply batch and hide replies
    const staffBatch = writeBatch(staff);
    staffBatch.set(
      doc(staff, 'supportReports/r1/replies/rep-team'),
      baseReply({
        authorUid: 'staff-1',
        authorName: 'OneClick Team',
        isTeam: true,
        body: 'Fix queued for the next image build.',
      })
    );
    staffBatch.update(doc(staff, 'supportReports/r1'), {
      replyCount: increment(1),
      lastReplyAt: serverTimestamp(),
      hasTeamReply: true,
      lastTeamReplyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(staffBatch.commit());
  });
});

describe('/supportFlags/{flagId}', () => {
  it('allows signed-in users to file open flags with valid paths; restricts read/triage to staff', async () => {
    const anon = anonDb();
    const alice = userDb('alice', { email: 'alice@example.com' });
    const staff = staffClaimDb();

    await assertFails(
      setDoc(doc(anon, 'supportFlags/f0'), {
        targetPath: 'supportReports/r1',
        reason: 'Spam link',
        reporterUid: 'anon',
        status: 'open',
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(alice, 'supportFlags/f-badpath'), {
        targetPath: 'users/admin/secret',
        reason: 'Path traversal',
        reporterUid: 'alice',
        status: 'open',
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(alice, 'supportFlags/f-badstatus'), {
        targetPath: 'supportReports/r1',
        reason: 'Spam link',
        reporterUid: 'alice',
        status: 'resolved',
        createdAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      setDoc(doc(alice, 'supportFlags/f1'), {
        targetPath: 'supportReports/r1',
        reason: 'Contains accidental phone number',
        reporterUid: 'alice',
        status: 'open',
        createdAt: serverTimestamp(),
      })
    );

    // Regular user cannot read, list, update, or delete flags
    await assertFails(getDoc(doc(alice, 'supportFlags/f1')));
    await assertFails(getDocs(collection(alice, 'supportFlags')));
    await assertFails(updateDoc(doc(alice, 'supportFlags/f1'), { status: 'resolved' }));
    await assertFails(deleteDoc(doc(alice, 'supportFlags/f1')));

    // Staff can read, triage, and delete
    await assertSucceeds(getDoc(doc(staff, 'supportFlags/f1')));
    await assertSucceeds(updateDoc(doc(staff, 'supportFlags/f1'), { status: 'resolved' }));
    await assertSucceeds(deleteDoc(doc(staff, 'supportFlags/f1')));
  });
});

describe('Beta Tester Dashboard & Private Board (/betaPosts, /betaNotes, /betaChecks)', () => {
  it('blocks non-beta and unauthenticated users from all beta collections', async () => {
    const anon = anonDb();
    const regular = userDb('regular', { email: 'regular@example.com' });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'betaPosts/bp1'), baseBetaPost({ createdAt: now, updatedAt: now }));
      await setDoc(doc(db, 'betaPosts/bp1/replies/br1'), {
        authorUid: 'tester1',
        authorName: 'Tester One',
        isTeam: false,
        body: 'Reply body',
        hidden: false,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'betaNotes/bn1'), {
        title: 'Build 44.20261113.0',
        body: 'Focus on suspend/resume and Wi-Fi.',
        buildUrl: 'https://oneclickos.org/download',
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'betaChecks/tester1_wifi'), {
        uid: 'tester1',
        item: 'Wi-Fi',
        status: 'works',
        note: 'Connects fast',
        pc: 'ThinkPad',
        version: '44.20261113.0',
        updatedAt: now,
      });
    });

    for (const db of [anon, regular]) {
      await assertFails(getDoc(doc(db, 'betaPosts/bp1')));
      await assertFails(getDocs(collection(db, 'betaPosts')));
      await assertFails(getDoc(doc(db, 'betaPosts/bp1/replies/br1')));
      await assertFails(getDoc(doc(db, 'betaNotes/bn1')));
      await assertFails(getDocs(collection(db, 'betaNotes')));
      await assertFails(getDoc(doc(db, 'betaChecks/tester1_wifi')));
      await assertFails(getDocs(collection(db, 'betaChecks')));
    }

    await assertFails(setDoc(doc(regular, 'betaPosts/bp2'), baseBetaPost({ authorUid: 'regular' })));
    await assertFails(
      setDoc(doc(regular, 'betaChecks/regular_wifi'), {
        uid: 'regular',
        item: 'Wi-Fi',
        status: 'works',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('allows approved beta testers (verified email doc, UID doc, or claim) to use /betaPosts, /betaNotes read, and /betaChecks', async () => {
    const testerByEmail = userDb('t-email-uid', {
      email: 'Tester.Email@Example.com',
      email_verified: true,
    });
    const testerByClaim = userDb('t-claim-uid', { email: 'claim@example.com', betaTester: true });
    const staff = staffClaimDb();

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'betaTesters/tester.email@example.com'), {
        active: true,
        email: 'tester.email@example.com',
      });
    });

    // Staff creates pinned betaNote (validates https:// buildUrl)
    await assertFails(
      setDoc(doc(staff, 'betaNotes/bn-xss'), {
        title: 'Bad link',
        body: 'Should fail',
        buildUrl: 'javascript:alert(1)',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      setDoc(doc(staff, 'betaNotes/bn1'), {
        title: 'Build 44.20261113.0',
        body: 'Please test audio and sleep.',
        buildUrl: 'https://oneclickos.org/download',
        version: '44.20261113.0',
        pinned: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Beta tester cannot modify betaNotes
    await assertFails(
      setDoc(doc(testerByEmail, 'betaNotes/bn2'), {
        title: 'Rogue note',
        body: 'Denied',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(getDoc(doc(testerByEmail, 'betaNotes/bn1')));

    // Beta tester creates betaPost (cannot spoof isTeam: true)
    await assertFails(
      setDoc(
        doc(testerByEmail, 'betaPosts/bp-spoof'),
        baseBetaPost({ authorUid: 't-email-uid', isTeam: true })
      )
    );
    await assertSucceeds(
      setDoc(
        doc(testerByEmail, 'betaPosts/bp1'),
        baseBetaPost({ authorUid: 't-email-uid', authorName: 'Tester Email' })
      )
    );

    // Second beta tester reads, replies, and cannot hijack first tester's post
    await assertSucceeds(getDoc(doc(testerByClaim, 'betaPosts/bp1')));
    await assertFails(
      updateDoc(doc(testerByClaim, 'betaPosts/bp1'), {
        title: 'Hijacked',
        updatedAt: serverTimestamp(),
      })
    );
    const betaReplyBatch = writeBatch(testerByClaim);
    betaReplyBatch.set(doc(testerByClaim, 'betaPosts/bp1/replies/br1'), {
      authorUid: 't-claim-uid',
      authorName: 'Claim Tester',
      isTeam: false,
      body: 'Audio works over HDMI too.',
      hidden: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    betaReplyBatch.update(doc(testerByClaim, 'betaPosts/bp1'), {
      replyCount: increment(1),
      lastReplyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(betaReplyBatch.commit());

    // Beta checks: own checklist create/update succeeds; hijacking or invalid status fails
    await assertSucceeds(
      setDoc(doc(testerByEmail, 'betaChecks/t-email-uid_wifi'), {
        uid: 't-email-uid',
        item: 'Wi-Fi',
        status: 'works',
        note: 'Tested on AX200',
        pc: 'Desktop',
        version: '44.20261113.0',
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(testerByEmail, 'betaChecks/t-email-uid_wifi'), {
        status: 'broken',
        note: 'Dropped after suspend',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(testerByClaim, 'betaChecks/t-email-uid_wifi'), {
        uid: 't-claim-uid',
        status: 'works',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(testerByClaim, 'betaChecks/t-claim-uid_bad'), {
        uid: 't-claim-uid',
        item: 'Audio',
        status: 'maybe',
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(deleteDoc(doc(testerByEmail, 'betaChecks/t-email-uid_wifi')));

    // Author can soft-delete / anonymize own betaPost with or without scrubbing `pc`
    await assertSucceeds(
      setDoc(
        doc(testerByEmail, 'betaPosts/bp-scrub'),
        baseBetaPost({ authorUid: 't-email-uid', authorName: 'Tester Email', pc: 'ThinkPad X1' })
      )
    );
    await assertFails(
      updateDoc(doc(testerByClaim, 'betaPosts/bp-scrub'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        body: '[deleted]',
        pc: '',
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(testerByEmail, 'betaPosts/bp-scrub'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        body: '[deleted]',
        pc: 'x'.repeat(161),
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(testerByEmail, 'betaPosts/bp-scrub'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        body: '[deleted]',
        title: 'Tampered title on delete',
        pc: '',
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(testerByEmail, 'betaPosts/bp-scrub'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        body: '[deleted]',
        pc: '',
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(testerByEmail, 'betaPosts/bp1'), {
        authorUid: 'deleted',
        authorName: 'deleted user',
        body: '[deleted]',
        deleted: true,
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(testerByEmail, 'betaPosts/bp-scrub'), {
        title: 'Restore after delete',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('denies email-based betaTesters access when email_verified is false or omitted', async () => {
    const unverifiedFalse = userDb('unverified-uid', {
      email: 'Unverified@Example.com',
      email_verified: false,
    });
    const unverifiedOmitted = userDb('unverified-uid-2', {
      email: 'Unverified@Example.com',
    });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'betaTesters/unverified@example.com'), {
        active: true,
        email: 'unverified@example.com',
        addedAt: now,
      });
      await setDoc(doc(db, 'betaPosts/bp1'), baseBetaPost({ createdAt: now, updatedAt: now }));
      await setDoc(
        doc(db, 'betaPosts/bp-own'),
        baseBetaPost({ authorUid: 'unverified-uid', createdAt: now, updatedAt: now })
      );
      await setDoc(doc(db, 'betaPosts/bp1/replies/br1'), {
        authorUid: 'tester1',
        authorName: 'Tester One',
        isTeam: false,
        body: 'Reply body',
        hidden: false,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'betaNotes/bn1'), {
        title: 'Build 44.20261113.0',
        body: 'Notes',
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'betaChecks/unverified-uid_wifi'), {
        uid: 'unverified-uid',
        item: 'Wi-Fi',
        status: 'works',
        updatedAt: now,
      });
    });

    for (const db of [unverifiedFalse, unverifiedOmitted]) {
      // Denied read and write on betaTesters/{email}
      await assertFails(getDoc(doc(db, 'betaTesters/unverified@example.com')));
      await assertFails(setDoc(doc(db, 'betaTesters/unverified@example.com'), { active: true }));
      await assertFails(
        updateDoc(doc(db, 'betaTesters/unverified@example.com'), { label: 'Spoof' })
      );
      await assertFails(deleteDoc(doc(db, 'betaTesters/unverified@example.com')));

      // Denied read and write on betaPosts and replies
      await assertFails(getDoc(doc(db, 'betaPosts/bp1')));
      await assertFails(getDocs(collection(db, 'betaPosts')));
      await assertFails(getDoc(doc(db, 'betaPosts/bp1/replies/br1')));
      await assertFails(
        setDoc(doc(db, 'betaPosts/bp-new'), baseBetaPost({ authorUid: 'unverified-uid' }))
      );
      await assertFails(
        updateDoc(doc(db, 'betaPosts/bp-own'), {
          body: 'Updated',
          updatedAt: serverTimestamp(),
        })
      );

      // Denied read and write on betaNotes
      await assertFails(getDoc(doc(db, 'betaNotes/bn1')));
      await assertFails(getDocs(collection(db, 'betaNotes')));
      await assertFails(
        setDoc(doc(db, 'betaNotes/bn-new'), {
          title: 'Unauthorized',
          body: 'Denied',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      // Denied read and write on betaChecks
      await assertFails(getDoc(doc(db, 'betaChecks/unverified-uid_wifi')));
      await assertFails(getDocs(collection(db, 'betaChecks')));
      await assertFails(
        setDoc(doc(db, 'betaChecks/unverified-uid_audio'), {
          uid: 'unverified-uid',
          item: 'Audio',
          status: 'works',
          updatedAt: serverTimestamp(),
        })
      );
      await assertFails(
        updateDoc(doc(db, 'betaChecks/unverified-uid_wifi'), {
          status: 'broken',
          updatedAt: serverTimestamp(),
        })
      );
    }
  });

  it('denies beta tester actions when betaTesters/{uid} or {email} has active: false (while allowing omitted active)', async () => {
    const inactiveUid = userDb('inactive-uid', {
      email: 'inactive-uid@example.com',
      email_verified: true,
    });
    const inactiveEmail = userDb('inactive-email-uid', {
      email: 'inactive-email@example.com',
      email_verified: true,
    });
    const legacyUid = userDb('legacy-uid');

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'betaTesters/inactive-uid'), {
        active: false,
        uid: 'inactive-uid',
        addedAt: now,
      });
      await setDoc(doc(db, 'betaTesters/inactive-email@example.com'), {
        active: false,
        email: 'inactive-email@example.com',
        addedAt: now,
      });
      await setDoc(doc(db, 'betaTesters/legacy-uid'), {
        uid: 'legacy-uid',
        addedAt: now,
      });
      await setDoc(doc(db, 'betaPosts/bp1'), baseBetaPost({ createdAt: now, updatedAt: now }));
      await setDoc(
        doc(db, 'betaPosts/bp-own'),
        baseBetaPost({ authorUid: 'inactive-uid', createdAt: now, updatedAt: now })
      );
      await setDoc(doc(db, 'betaNotes/bn1'), {
        title: 'Build 44.20261113.0',
        body: 'Notes',
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'betaChecks/inactive-uid_wifi'), {
        uid: 'inactive-uid',
        item: 'Wi-Fi',
        status: 'works',
        updatedAt: now,
      });
    });

    // Self status doc check still works so client UI can read active: false
    await assertSucceeds(getDoc(doc(inactiveUid, 'betaTesters/inactive-uid')));
    await assertSucceeds(getDoc(doc(inactiveEmail, 'betaTesters/inactive-email@example.com')));

    for (const [db, uid] of [
      [inactiveUid, 'inactive-uid'],
      [inactiveEmail, 'inactive-email-uid'],
    ]) {
      await assertFails(getDocs(collection(db, 'betaTesters')));
      await assertFails(getDoc(doc(db, 'betaPosts/bp1')));
      await assertFails(getDocs(collection(db, 'betaPosts')));
      await assertFails(setDoc(doc(db, 'betaPosts/bp-new'), baseBetaPost({ authorUid: uid })));
      await assertFails(getDoc(doc(db, 'betaNotes/bn1')));
      await assertFails(getDocs(collection(db, 'betaNotes')));
      await assertFails(getDoc(doc(db, 'betaChecks/inactive-uid_wifi')));
      await assertFails(getDocs(collection(db, 'betaChecks')));
      await assertFails(
        setDoc(doc(db, `betaChecks/${uid}_audio`), {
          uid,
          item: 'Audio',
          status: 'works',
          updatedAt: serverTimestamp(),
        })
      );
    }

    // Even as the original author, inactive UID tester cannot edit/delete existing betaPosts or betaChecks
    await assertFails(
      updateDoc(doc(inactiveUid, 'betaPosts/bp-own'), {
        body: 'Edited while inactive',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(inactiveUid, 'betaPosts/bp-own')));
    await assertFails(
      updateDoc(doc(inactiveUid, 'betaChecks/inactive-uid_wifi'), {
        status: 'broken',
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(inactiveUid, 'betaChecks/inactive-uid_wifi')));

    // Legacy tester doc omitting `active` still grants beta access
    await assertSucceeds(getDoc(doc(legacyUid, 'betaPosts/bp1')));
    await assertSucceeds(getDoc(doc(legacyUid, 'betaNotes/bn1')));
  });

  it('stays within Firestore get/exists budget on worst-case betaPosts & replies batch with inactive staff/UID docs and verified active email doc', async () => {
    const worstCaseTester = userDb('wc-uid', {
      email: 'WorstCase@Example.com',
      email_verified: true,
    });

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const now = Timestamp.now();
      await setDoc(doc(db, 'oneclickStaff/wc-uid'), { active: false, role: 'triage' });
      await setDoc(doc(db, 'betaTesters/wc-uid'), { active: false, uid: 'wc-uid' });
      await setDoc(doc(db, 'betaTesters/worstcase@example.com'), {
        active: true,
        email: 'worstcase@example.com',
      });
      await setDoc(doc(db, 'betaPosts/bp-wc'), baseBetaPost({ createdAt: now, updatedAt: now }));
    });

    // Staff action still denied because oneclickStaff/wc-uid is active: false
    await assertFails(
      setDoc(doc(worstCaseTester, 'betaNotes/bn-denied'), {
        title: 'Denied',
        body: 'Should fail',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Worst-case betaPosts create + reply batch succeeds well under the 10-get limit
    await assertSucceeds(
      setDoc(
        doc(worstCaseTester, 'betaPosts/bp-wc-new'),
        baseBetaPost({ authorUid: 'wc-uid', authorName: 'Worst Case' })
      )
    );
    const batch = writeBatch(worstCaseTester);
    batch.set(doc(worstCaseTester, 'betaPosts/bp-wc/replies/br-wc'), {
      authorUid: 'wc-uid',
      authorName: 'Worst Case',
      isTeam: false,
      body: 'Reply under worst-case lookup budget.',
      hidden: false,
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(worstCaseTester, 'betaPosts/bp-wc'), {
      replyCount: increment(1),
      lastReplyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });
});
