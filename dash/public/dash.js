/* Beta tester dashboard behaviour (dash.betatesters.oneclickos.org / oneclick-dash.web.app).
   Same Firebase project (codecraft-sol) as support.oneclickos.org.
   Strictly zero automatic OS or browser hardware collection: testers enter their OS version manually. */
(function () {
  const OPEN_SIGNUPS = false;
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCiN6H0yknBX1ZcFuRmma0N1UWFs1CzM90",
    authDomain: "codecraft-sol.firebaseapp.com",
    projectId: "codecraft-sol",
    appId: "1:82176940262:web:3fd2e1eb941d684c798327"
  };
  var OWNER_EMAIL = "admin@codecraftsol.org";
  var FIREBASE_SDK_BASE = "https://www.gstatic.com/firebasejs/11.6.0";
  var CHECK_STATUSES = ['works', 'broken', 'untested'];
  var FLAG_STATUSES = ['open', 'reviewed', 'resolved', 'dismissed'];
  var DEFAULT_CHECK_ITEMS = [
    'Start-up and sign-in',
    'Wi-Fi and Ethernet',
    'Sound and microphone',
    'Display and text scaling',
    'Sleep and wake',
    'App Store',
    'System Update'
  ];

  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clip(v, max) { return String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max); }

  /* ---------- theme toggle & wordmark swap ---------- */
  function theme() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }
  function paint() {
    var t = theme();
    document.querySelectorAll('img[data-wordmark]').forEach(function (i) { i.src = '/assets/wordmark-' + t + '.svg'; });
  }
  paint();
  var tb = document.getElementById('theme');
  if (tb) tb.addEventListener('click', function () {
    root.dataset.theme = theme() === 'light' ? 'dark' : 'light';
    store('oneclick-theme', root.dataset.theme);
    paint();
  });

  var mb = document.getElementById('menu'), top = document.querySelector('header.top');
  if (mb && top) mb.addEventListener('click', function () {
    mb.setAttribute('aria-expanded', String(top.classList.toggle('open')));
  });

  /* ---------- ?emulator=1 persisted in sessionStorage ---------- */
  var qs = new URLSearchParams(location.search);
  var emuParam = qs.get('emulator');
  if (emuParam === '1' || emuParam === 'true') sstore('oneclick-emulator', '1');
  else if (emuParam === '0' || emuParam === 'false') sstore('oneclick-emulator', null);
  function isEmulator() { return sstore('oneclick-emulator') === '1'; }

  function supportOrigin() {
    if (location.hostname.endsWith('.oneclickos.org')) return 'https://support.oneclickos.org';
    return 'https://oneclick-support.web.app';
  }

  function tsMillis(ts) {
    if (!ts) return 0;
    if (ts instanceof Date) return isNaN(ts.getTime()) ? 0 : ts.getTime();
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    return 0;
  }

  function fmtDate(ts) {
    if (!ts) return 'Just now';
    var d = typeof ts.toDate === 'function' ? ts.toDate() : (ts instanceof Date ? ts : null);
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function slugify(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  }

  function isSafeHttpsUrl(url) {
    return typeof url === 'string' && /^https:\/\/\S+$/i.test(url.trim());
  }

  function friendlyError(err) {
    var code = err && err.code ? String(err.code) : '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'That email or password did not match.';
    }
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Google sign-in was cancelled before finishing.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Your browser blocked the Google sign-in window. Allow popups for this site and try again.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return 'An account already exists with this email using a different sign-in method.';
    }
    if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found' || code === 'auth/unauthorized-domain') {
      return 'Sign-in is not turned on yet on this site.';
    }
    if (code === 'auth/network-request-failed' || code === 'unavailable') {
      return 'Could not reach the server. Check your internet connection and try again.';
    }
    if (code === 'permission-denied') return 'You do not have permission to do that.';
    return (err && err.message) ? err.message : 'Something went wrong. Please try again.';
  }

  function getField(container, names) {
    if (!container) return null;
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (container.elements && typeof container.elements.namedItem === 'function') {
        var byNamedItem = container.elements.namedItem(n);
        if (byNamedItem) return byNamedItem;
      }
      var byName = container.querySelector('[name="' + n + '"]');
      if (byName) return byName;
      var byId = document.getElementById(n);
      if (byId && container.contains(byId)) return byId;
    }
    return null;
  }

  function showFormMsg(form, msg, isErr) {
    if (!form) return;
    var box = form.querySelector('[data-form-msg]');
    if (!box) {
      box = document.createElement('p');
      box.setAttribute('data-form-msg', '1');
      box.setAttribute('aria-live', 'polite');
      form.appendChild(box);
    }
    box.hidden = !msg;
    box.className = isErr ? 'err status-msg' : 'status-note status-msg';
    box.textContent = msg;
  }

  function clearFormMsg(form) {
    if (!form) return;
    var box = form.querySelector('[data-form-msg]');
    if (box) { box.textContent = ''; box.hidden = true; }
  }

  var authGateEl = document.getElementById('dash-auth-gate');
  var googleBtn = document.getElementById('dash-google-btn');
  var signinForm = document.getElementById('dash-signin-form');
  var emailLinkBtn = document.getElementById('dash-emaillink-btn');
  var mainEl = document.getElementById('dash-main');
  var userMetaEl = document.getElementById('dash-user-meta');
  var osForm = document.getElementById('dash-os-form');
  var notificationsEl = document.getElementById('dash-notifications');
  var markSeenBtn = document.getElementById('dash-mark-seen-btn');
  var myReportsEl = document.getElementById('dash-my-reports');
  var notesEl = document.getElementById('dash-notes');
  var installerEl = document.getElementById('dash-installer');
  var checklistEl = document.getElementById('dash-checklist');
  var staffPanelEl = document.getElementById('dash-staff-panel');

  async function loadFirebase() {
    var modApp = await import(FIREBASE_SDK_BASE + '/firebase-app.js');
    var modAuth = await import(FIREBASE_SDK_BASE + '/firebase-auth.js');
    var modFs = await import(FIREBASE_SDK_BASE + '/firebase-firestore.js');
    var app = modApp.getApps().length ? modApp.getApp() : modApp.initializeApp(FIREBASE_CONFIG);
    var auth = modAuth.getAuth(app);
    var db = modFs.getFirestore(app);
    if (isEmulator()) {
      try { modAuth.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); } catch (e) {}
      try { modFs.connectFirestoreEmulator(db, '127.0.0.1', 8080); } catch (e) {}
      window.addEventListener('pagehide', function () {
        try {
          if (typeof modFs.terminate === 'function') Promise.resolve(modFs.terminate(db)).catch(function () {});
        } catch (e) {}
      });
    }
    return {
      app: app,
      auth: auth,
      db: db,
      F: Object.assign({}, modAuth, {
        GoogleAuthProvider: modAuth.GoogleAuthProvider,
        signInWithPopup: modAuth.signInWithPopup,
        reauthenticateWithPopup: modAuth.reauthenticateWithPopup,
        getAdditionalUserInfo: modAuth.getAdditionalUserInfo,
        deleteUser: modAuth.deleteUser
      }),
      D: modFs
    };
  }

  async function isPreApprovedBetaOrStaff(ctx, user) {
    if (!user) return false;
    var D = ctx.D, db = ctx.db;
    var emailLower = user.email ? user.email.toLowerCase() : '';
    var verifiedEmail = !!(user.emailVerified && emailLower);
    if (emailLower === OWNER_EMAIL && verifiedEmail) return true;
    try {
      var sSnap = await D.getDoc(D.doc(db, 'oneclickStaff', user.uid));
      if (sSnap.exists() && sSnap.data().active !== false) return true;
    } catch (e) {}
    try {
      var uSnap = await D.getDoc(D.doc(db, 'betaTesters', user.uid));
      if (uSnap.exists() && uSnap.data().active !== false) return true;
    } catch (e) {}
    if (verifiedEmail) {
      try {
        var eSnap = await D.getDoc(D.doc(db, 'betaTesters', emailLower));
        if (eSnap.exists() && eSnap.data().active !== false) return true;
      } catch (e) {}
    }
    return false;
  }

  async function resolveUserState(ctx, user) {
    var D = ctx.D, db = ctx.db;
    if (!user) return { user: null, isStaff: false, isBeta: false, displayName: '', meta: null };
    var isStaff = false, isBeta = false, meta = null;

    try {
      var token = await user.getIdTokenResult();
      var claims = (token && token.claims) || {};
      if (claims.staff === true) isStaff = true;
      if (claims.betaTester === true) isBeta = true;
    } catch (e) {}

    var emailLower = user.email ? user.email.toLowerCase() : '';
    if (emailLower === OWNER_EMAIL) isStaff = true;

    try {
      var sSnap = await D.getDoc(D.doc(db, 'oneclickStaff', user.uid));
      if (sSnap.exists() && sSnap.data().active !== false) isStaff = true;
    } catch (e) {}

    if (isStaff) isBeta = true;

    if (!isBeta) {
      try {
        var uSnap = await D.getDoc(D.doc(db, 'betaTesters', user.uid));
        if (uSnap.exists() && uSnap.data().active !== false) isBeta = true;
      } catch (e) {}
    }
    if (!isBeta && emailLower) {
      try {
        var eSnap = await D.getDoc(D.doc(db, 'betaTesters', emailLower));
        if (eSnap.exists() && eSnap.data().active !== false) isBeta = true;
      } catch (e) {}
    }

    try {
      var mSnap = await D.getDoc(D.doc(db, 'supportAccountMeta', user.uid));
      if (mSnap.exists()) meta = mSnap.data();
    } catch (e) {}

    var displayName = clip((meta && meta.displayName) || user.displayName || 'Tester', 60) || 'Tester';
    return { user: user, isStaff: isStaff, isBeta: isBeta, displayName: displayName, meta: meta };
  }

  function renderAuthGateNote(msg, showSignOut, ctx) {
    if (!authGateEl) return;
    var note = authGateEl.querySelector('[data-gate-msg]');
    if (!note) {
      note = document.createElement('div');
      note.setAttribute('data-gate-msg', '1');
      authGateEl.prepend(note);
    }
    if (!msg) {
      note.innerHTML = '';
      note.hidden = true;
      return;
    }
    note.hidden = false;
    note.innerHTML = '<p class="err">' + esc(msg) + '</p>' +
      (showSignOut ? '<p><button type="button" class="btn ghost" id="dash-gate-signout">Sign out</button></p>' : '');
    var btn = document.getElementById('dash-gate-signout');
    if (btn && ctx) btn.addEventListener('click', function () { ctx.F.signOut(ctx.auth).catch(function () {}); });
  }

  function startDashboard(ctx, initialGateErr) {
    var D = ctx.D, F = ctx.F, db = ctx.db, auth = ctx.auth;
    var state = { user: null, isStaff: false, isBeta: false, displayName: '', meta: null, signingIn: false };
    var pendingGateErr = initialGateErr || '';

    if (googleBtn) googleBtn.addEventListener('click', async function () {
      pendingGateErr = '';
      if (signinForm) clearFormMsg(signinForm);
      renderAuthGateNote('', false, ctx);
      googleBtn.disabled = true;
      state.signingIn = true;
      try {
        var provider = new F.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        var cred = await F.signInWithPopup(auth, provider);
        var info = typeof F.getAdditionalUserInfo === 'function' ? F.getAdditionalUserInfo(cred) : null;
        var isNewUser = !!(info && info.isNewUser);
        if (!OPEN_SIGNUPS && isNewUser) {
          var allowed = await isPreApprovedBetaOrStaff(ctx, cred.user);
          if (!allowed) {
            try { await F.deleteUser(cred.user); } catch (eDel) {}
            try { await F.signOut(auth); } catch (eOut) {}
            pendingGateErr = 'New accounts are currently closed without beta tester approval.';
            return;
          }
        }
      } catch (err) {
        pendingGateErr = friendlyError(err);
      } finally {
        state.signingIn = false;
        googleBtn.disabled = false;
        await applyDashboardUser(auth.currentUser);
      }
    });

    if (signinForm) signinForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      pendingGateErr = '';
      clearFormMsg(signinForm);
      var emailEl = getField(signinForm, ['email']) || signinForm.querySelector('input[type="email"]');
      var passEl = getField(signinForm, ['password']) || signinForm.querySelector('input[type="password"]');
      var email = clip(emailEl && emailEl.value, 320);
      var pass = passEl ? passEl.value : '';
      if (!email || !pass) {
        showFormMsg(signinForm, 'Enter your email and password.', true);
        return;
      }
      try {
        await F.signInWithEmailAndPassword(auth, email, pass);
      } catch (err) {
        showFormMsg(signinForm, friendlyError(err), true);
      }
    });

    if (emailLinkBtn) emailLinkBtn.addEventListener('click', async function () {
      pendingGateErr = '';
      if (signinForm) clearFormMsg(signinForm);
      var emailEl = signinForm && (getField(signinForm, ['email']) || signinForm.querySelector('input[type="email"]'));
      var email = clip(emailEl && emailEl.value, 320);
      if (!email) {
        if (signinForm) showFormMsg(signinForm, 'Enter your email address first, then press email-link sign-in.', true);
        return;
      }
      try {
        var redirectUrl = location.origin + location.pathname + (isEmulator() ? '?emulator=1' : '');
        await F.sendSignInLinkToEmail(auth, email, { url: redirectUrl, handleCodeInApp: true });
        store('oneclick-email-for-signin', email);
        if (signinForm) showFormMsg(signinForm, 'Sign-in link sent. Check your inbox on this device.', false);
      } catch (err) {
        if (signinForm) showFormMsg(signinForm, friendlyError(err), true);
      }
    });

    function renderUserMeta() {
      if (!userMetaEl || !state.user) return;
      var roleBadge = state.isStaff ? '<span class="badge team">OneClick team</span>' : '<span class="badge beta">Beta tester</span>';
      userMetaEl.innerHTML =
        '<div class="dash-meta-row">' +
        '<div><strong>' + esc(state.displayName) + '</strong> ' + roleBadge +
        '<div class="muted">' + esc(state.user.email || '') + '</div>' +
        '<p class="status-note">Signed in to the beta dashboard. Because the support site uses a separate address, you sign in once on each.</p></div>' +
        '<button type="button" class="btn ghost" id="dash-signout-btn">Sign out</button>' +
        '</div>';
      var outBtn = document.getElementById('dash-signout-btn');
      if (outBtn) outBtn.addEventListener('click', function () { F.signOut(auth).catch(function () {}); });
    }

    if (osForm) osForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!state.user) return;
      clearFormMsg(osForm);
      var verEl = getField(osForm, ['osVersion', 'version']) || osForm.querySelector('input, select');
      var osVersion = clip(verEl && verEl.value, 40);
      try {
        await D.setDoc(D.doc(db, 'supportAccountMeta', state.user.uid), {
          osVersion: osVersion,
          updatedAt: D.serverTimestamp()
        }, { merge: true });
        state.meta = Object.assign({}, state.meta || {}, { osVersion: osVersion });
        showFormMsg(osForm, 'Saved your version (' + (osVersion || 'cleared') + ').', false);
      } catch (err) {
        showFormMsg(osForm, friendlyError(err), true);
      }
    });

    async function markNotificationsSeen() {
      if (!state.user) return;
      try {
        await D.setDoc(D.doc(db, 'supportAccountMeta', state.user.uid), {
          lastSeenRepliesAt: D.serverTimestamp(),
          updatedAt: D.serverTimestamp()
        }, { merge: true });
        state.meta = Object.assign({}, state.meta || {}, { lastSeenRepliesAt: new Date() });
        await loadReportsAndNotifications();
      } catch (err) {
        if (notificationsEl) notificationsEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    if (markSeenBtn) markSeenBtn.addEventListener('click', markNotificationsSeen);

    async function loadReportsAndNotifications() {
      if (!state.user) return;
      try {
        var qRef = state.isStaff
          ? D.collection(db, 'supportReports')
          : D.query(D.collection(db, 'supportReports'), D.where('hidden', '==', false));
        var snap = await D.getDocs(qRef);
        var mine = snap.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        }).filter(function (r) { return r.authorUid === state.user.uid && !r.deleted; })
          .sort(function (a, b) { return tsMillis(b.createdAt) - tsMillis(a.createdAt); });

        var seenMs = tsMillis(state.meta && state.meta.lastSeenRepliesAt);
        var unread = mine.filter(function (r) {
          return r.lastTeamReplyAt && tsMillis(r.lastTeamReplyAt) > seenMs;
        });

        if (notificationsEl) {
          if (!unread.length) {
            notificationsEl.innerHTML = '<p class="status-note">No new team replies on your reports.</p>';
            if (markSeenBtn) markSeenBtn.hidden = true;
          } else {
            var itemsHtml = unread.map(function (r) {
              return '<li><a href="' + esc(supportOrigin() + '/reports?report=' + r.id) + '" rel="noopener">' +
                '<strong>' + esc(r.title) + '</strong></a> — OneClick team replied on ' + esc(fmtDate(r.lastTeamReplyAt)) + '</li>';
            }).join('');
            notificationsEl.innerHTML = '<ul class="dash-list">' + itemsHtml + '</ul>' +
              (markSeenBtn ? '' : '<p><button type="button" class="btn ghost" id="dash-mark-seen-btn">Mark replies seen</button></p>');
            if (markSeenBtn) markSeenBtn.hidden = false;
            var dynSeen = document.getElementById('dash-mark-seen-btn');
            if (dynSeen && dynSeen !== markSeenBtn) dynSeen.addEventListener('click', markNotificationsSeen);
          }
        }

        if (myReportsEl) {
          if (!mine.length) {
            myReportsEl.innerHTML = '<p class="status-note">You have not posted any community reports yet. ' +
              '<a href="' + esc(supportOrigin() + '/reports') + '" rel="noopener">Open reports</a>.</p>';
          } else {
            myReportsEl.innerHTML = mine.map(function (r) {
              return '<div class="dash-report-row">' +
                '<a href="' + esc(supportOrigin() + '/reports?report=' + r.id) + '" rel="noopener"><strong>' + esc(r.title) + '</strong></a> ' +
                '<span class="badge">' + esc(r.status || 'new') + '</span> ' +
                (r.hasTeamReply ? '<span class="badge team">OneClick team replied</span> ' : '') +
                '<span class="muted">(' + esc(r.replyCount || 0) + ' replies, ' + esc(r.sameCount || 0) + ' same)</span>' +
                '</div>';
            }).join('');
          }
        }
      } catch (err) {
        if (myReportsEl) myReportsEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    async function loadNotesAndInstaller() {
      try {
        var snap = await D.getDocs(D.collection(db, 'betaNotes'));
        var notes = snap.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        }).sort(function (a, b) {
          var pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
          if (pinDiff) return pinDiff;
          return tsMillis(b.updatedAt || b.createdAt) - tsMillis(a.updatedAt || a.createdAt);
        });

        if (notesEl) {
          if (!notes.length) {
            notesEl.innerHTML = '<p class="status-note">No team test notes posted yet.</p>';
          } else {
            notesEl.innerHTML = notes.map(function (n) {
              var linkHtml = isSafeHttpsUrl(n.buildUrl)
                ? '<p><a class="btn ghost" href="' + esc(n.buildUrl) + '" rel="noopener">Build link</a></p>'
                : '';
              return '<article class="dash-note">' +
                '<div class="dash-note-head">' +
                (n.pinned ? '<span class="badge team">Pinned</span> ' : '') +
                (n.version ? '<span class="badge">' + esc(n.version) + '</span> ' : '') +
                '<strong>' + esc(n.title) + '</strong> ' +
                '<span class="muted">' + esc(fmtDate(n.updatedAt || n.createdAt)) + '</span>' +
                '</div>' +
                '<p class="prewrap">' + esc(n.body) + '</p>' +
                linkHtml +
                '</article>';
            }).join('');
          }
        }

        if (installerEl) {
          var latestBuild = notes.find(function (n) { return isSafeHttpsUrl(n.buildUrl); });
          if (latestBuild) {
            installerEl.innerHTML =
              '<p><strong>Test build link</strong>' + (latestBuild.version ? ' (' + esc(latestBuild.version) + ')' : '') + '</p>' +
              '<p class="status-note">Public USB/ISO releases are still in progress. Use the link below to fetch the latest test build noted by the team.</p>' +
              '<p><a class="btn" href="' + esc(latestBuild.buildUrl) + '" rel="noopener">Open test build</a></p>';
          } else {
            installerEl.innerHTML =
              '<p><strong>Installer status:</strong> The PC USB/ISO installer is not ready for public download yet.</p>' +
              '<p class="status-note">Build status and test runs live on GitHub while CI packaging is finalized.</p>' +
              '<p><a class="btn ghost" href="https://github.com/Codecraft-Solutions-Team/oneclick-os/actions" rel="noopener">View build status on GitHub</a></p>';
          }
        }
        return notes;
      } catch (err) {
        if (notesEl) notesEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
        return [];
      }
    }

    async function loadChecklist() {
      if (!checklistEl || !state.user) return;
      try {
        var snap = await D.getDocs(D.collection(db, 'betaChecks'));
        var rows = snap.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        }).sort(function (a, b) { return tsMillis(b.updatedAt) - tsMillis(a.updatedAt); });

        var myByItem = {};
        rows.filter(function (r) { return r.uid === state.user.uid; }).forEach(function (r) {
          myByItem[r.item] = r;
        });

        var itemOptions = DEFAULT_CHECK_ITEMS.map(function (item) {
          return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
        }).join('');

        var html = '<form id="dash-check-form" class="report">' +
          '<label>Feature or device <input name="item" list="dash-check-items" required maxlength="120" placeholder="Wi-Fi, Sleep, App Store..."></label>' +
          '<datalist id="dash-check-items">' + itemOptions + '</datalist>' +
          '<label>Result <select name="status"><option value="works">works</option><option value="broken">broken</option><option value="untested">untested</option></select></label>' +
          '<label>PC / Hardware <input name="pc" maxlength="160" placeholder="Optional"></label>' +
          '<label>OneClick version <input name="version" maxlength="60" value="' + esc((state.meta && state.meta.osVersion) || '') + '" placeholder="0.1"></label>' +
          '<label>Notes <textarea name="note" rows="2" maxlength="1000" placeholder="What happened?"></textarea></label>' +
          '<button type="submit" class="btn">Save check</button>' +
          '</form>';

        var myRows = rows.filter(function (r) { return r.uid === state.user.uid; });
        html += '<h3>Your checks (' + myRows.length + ')</h3>';
        if (!myRows.length) {
          html += '<p class="status-note">No checks saved yet.</p>';
        } else {
          html += '<div class="dash-checks-list">' + myRows.map(function (r) {
            return '<div class="dash-check-row">' +
              '<span class="badge status-' + esc(r.status) + '">' + esc(r.status) + '</span> ' +
              '<strong>' + esc(r.item) + '</strong> ' +
              (r.version ? '<span class="muted">(' + esc(r.version) + ')</span> ' : '') +
              (r.pc ? '<span class="muted">on ' + esc(r.pc) + '</span> ' : '') +
              (r.note ? '<div>' + esc(r.note) + '</div>' : '') +
              '<button type="button" class="link-btn" data-del-check="' + esc(r.id) + '">Remove</button>' +
              '</div>';
          }).join('') + '</div>';
        }

        var otherRows = rows.filter(function (r) { return r.uid !== state.user.uid; }).slice(0, 30);
        if (otherRows.length) {
          html += '<h3>Recent tester checks (' + otherRows.length + ')</h3><div class="dash-checks-list">' +
            otherRows.map(function (r) {
              return '<div class="dash-check-row">' +
                '<span class="badge status-' + esc(r.status) + '">' + esc(r.status) + '</span> ' +
                '<strong>' + esc(r.item) + '</strong> ' +
                (r.version ? '<span class="muted">(' + esc(r.version) + ')</span> ' : '') +
                (r.pc ? '<span class="muted">on ' + esc(r.pc) + '</span> ' : '') +
                '<span class="muted">' + esc(fmtDate(r.updatedAt)) + '</span>' +
                (r.note ? '<div>' + esc(r.note) + '</div>' : '') +
                '</div>';
            }).join('') + '</div>';
        }

        checklistEl.innerHTML = html;

        var checkForm = document.getElementById('dash-check-form');
        if (checkForm) checkForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          clearFormMsg(checkForm);
          var itemEl = checkForm.elements.namedItem('item');
          var statusEl = checkForm.elements.namedItem('status');
          var pcEl = checkForm.elements.namedItem('pc');
          var versionEl = checkForm.elements.namedItem('version');
          var noteEl = checkForm.elements.namedItem('note');
          var item = clip(itemEl && itemEl.value, 120);
          var statusVal = statusEl ? statusEl.value : 'untested';
          var status = CHECK_STATUSES.indexOf(statusVal) >= 0 ? statusVal : 'untested';
          var pc = clip(pcEl && pcEl.value, 160);
          var version = clip(versionEl && versionEl.value, 60);
          var note = clip(noteEl && noteEl.value, 1000);
          if (!item) {
            showFormMsg(checkForm, 'Enter a feature or device name.', true);
            return;
          }
          var checkId = (state.user.uid + '_' + slugify(item)).slice(0, 200);
          try {
            await D.setDoc(D.doc(db, 'betaChecks', checkId), {
              uid: state.user.uid,
              item: item,
              status: status,
              note: note,
              pc: pc,
              version: version,
              updatedAt: D.serverTimestamp()
            });
            await loadChecklist();
          } catch (err) {
            showFormMsg(checkForm, friendlyError(err), true);
          }
        });

        checklistEl.querySelectorAll('[data-del-check]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var id = btn.getAttribute('data-del-check');
            try {
              await D.deleteDoc(D.doc(db, 'betaChecks', id));
              await loadChecklist();
            } catch (err) {
              var msgEl = document.createElement('p');
              msgEl.className = 'err';
              msgEl.textContent = friendlyError(err);
              checklistEl.prepend(msgEl);
            }
          });
        });
      } catch (err) {
        checklistEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    async function loadStaffPanel(statusMsg, isErr) {
      if (!staffPanelEl) return;
      staffPanelEl.hidden = !state.isStaff;
      if (!state.isStaff) {
        staffPanelEl.innerHTML = '';
        return;
      }
      staffPanelEl.innerHTML = '<p class="status-note">Loading staff tools...</p>';
      try {
        var results = await Promise.all([
          D.getDocs(D.collection(db, 'betaNotes')),
          D.getDocs(D.collection(db, 'supportFlags')),
          D.getDocs(D.collection(db, 'betaTesters')),
          D.getDocs(D.collection(db, 'supportInvites'))
        ]);
        var notes = results[0].docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
        var flags = results[1].docs.map(function (d) { var o = d.data(); o.id = d.id; return o; })
          .sort(function (a, b) { return tsMillis(b.createdAt) - tsMillis(a.createdAt); });
        var testers = results[2].docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
        var invites = results[3].docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });

        var html = '<h2>Staff controls</h2><div id="dash-staff-msg" class="' + (statusMsg ? (isErr ? 'err' : 'status-note') : '') + '" aria-live="polite">' + (statusMsg ? esc(statusMsg) : '') + '</div>';

        // 1. Beta notes form & list
        html += '<section class="dash-staff-block"><h3>Post team note</h3>' +
          '<form id="staff-note-form" class="report">' +
          '<label>Title <input name="title" required maxlength="160"></label>' +
          '<label>Version <input name="version" maxlength="60" placeholder="0.1"></label>' +
          '<label>Build URL (https:// only, optional) <input name="buildUrl" type="url" maxlength="500" placeholder="https://..."></label>' +
          '<label>Note <textarea name="body" rows="3" required maxlength="4000"></textarea></label>' +
          '<label class="inline"><input type="checkbox" name="pinned"> Pin note at top</label>' +
          '<button type="submit" class="btn">Publish note</button>' +
          '</form>' +
          '<div class="dash-staff-list">' +
          notes.map(function (n) {
            return '<div class="dash-staff-row"><strong>' + esc(n.title) + '</strong> ' +
              (n.pinned ? '<span class="badge team">Pinned</span> ' : '') +
              '<button type="button" class="link-btn" data-staff-pin-note="' + esc(n.id) + '" data-pinned="' + String(!!n.pinned) + '">' + (n.pinned ? 'Unpin' : 'Pin') + '</button> ' +
              '<button type="button" class="link-btn" data-staff-del-note="' + esc(n.id) + '">Delete</button></div>';
          }).join('') +
          '</div></section>';

        // 2. Support flags
        html += '<section class="dash-staff-block"><h3>Flagged posts (' + flags.length + ')</h3>';
        if (!flags.length) {
          html += '<p class="status-note">No flags right now.</p>';
        } else {
          html += '<div class="dash-staff-list">' + flags.map(function (fl) {
            var stOpts = FLAG_STATUSES.map(function (s) {
              return '<option value="' + esc(s) + '"' + (fl.status === s ? ' selected' : '') + '>' + esc(s) + '</option>';
            }).join('');
            return '<div class="dash-staff-row">' +
              '<code>' + esc(fl.targetPath) + '</code> — ' + esc(fl.reason) + ' ' +
              '<select data-flag-status="' + esc(fl.id) + '">' + stOpts + '</select> ' +
              '<button type="button" class="link-btn" data-flag-hide-target="' + esc(fl.targetPath) + '">Hide target</button> ' +
              '<button type="button" class="link-btn" data-flag-del="' + esc(fl.id) + '">Dismiss/delete</button>' +
              '</div>';
          }).join('') + '</div>';
        }
        html += '</section>';

        // 3. Beta testers
        html += '<section class="dash-staff-block"><h3>Beta testers (' + testers.length + ')</h3>' +
          '<form id="staff-tester-form" class="report">' +
          '<label>Email or UID <input name="identifier" required maxlength="320" placeholder="tester@example.com"></label>' +
          '<label>Label (optional) <input name="label" maxlength="120" placeholder="Early tester"></label>' +
          '<button type="submit" class="btn">Add beta tester</button>' +
          '</form>' +
          '<div class="dash-staff-list">' +
          testers.map(function (t) {
            return '<div class="dash-staff-row"><code>' + esc(t.id) + '</code>' +
              (t.label ? ' (' + esc(t.label) + ')' : '') + ' ' +
              '<button type="button" class="link-btn" data-staff-del-tester="' + esc(t.id) + '">Remove</button></div>';
          }).join('') +
          '</div></section>';

        // 4. Support invites
        html += '<section class="dash-staff-block"><h3>Signup invite codes (' + invites.length + ')</h3>' +
          '<form id="staff-invite-form" class="report">' +
          '<label>Code <input name="code" required minlength="3" maxlength="64" placeholder="BETA2026"></label>' +
          '<label>Label <input name="label" required maxlength="120" placeholder="Early testers"></label>' +
          '<label>Max uses <input name="maxUses" type="number" min="1" max="100000" value="25" required></label>' +
          '<button type="submit" class="btn">Create invite code</button>' +
          '</form>' +
          '<div class="dash-staff-list">' +
          invites.map(function (inv) {
            return '<div class="dash-staff-row"><code>' + esc(inv.id) + '</code> — ' + esc(inv.label) +
              ' (' + esc(inv.uses) + '/' + esc(inv.maxUses) + ', ' + (inv.active ? 'active' : 'inactive') + ') ' +
              '<button type="button" class="link-btn" data-staff-toggle-invite="' + esc(inv.id) + '" data-active="' + String(!!inv.active) + '">' + (inv.active ? 'Disable' : 'Enable') + '</button> ' +
              '<button type="button" class="link-btn" data-staff-del-invite="' + esc(inv.id) + '">Delete</button></div>';
          }).join('') +
          '</div></section>';

        staffPanelEl.innerHTML = html;
        var staffMsg = document.getElementById('dash-staff-msg');

        var noteForm = document.getElementById('staff-note-form');
        if (noteForm) noteForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var title = clip(noteForm.elements.namedItem('title').value, 160);
          var version = clip(noteForm.elements.namedItem('version').value, 60);
          var buildUrl = clip(noteForm.elements.namedItem('buildUrl').value, 500);
          var body = clip(noteForm.elements.namedItem('body').value, 4000);
          var pinned = !!noteForm.elements.namedItem('pinned').checked;
          if (buildUrl && !isSafeHttpsUrl(buildUrl)) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = 'Build URL must start with https://'; }
            return;
          }
          try {
            await D.addDoc(D.collection(db, 'betaNotes'), {
              title: title,
              body: body,
              buildUrl: buildUrl,
              version: version,
              pinned: pinned,
              authorUid: state.user.uid,
              authorName: state.displayName,
              createdAt: D.serverTimestamp(),
              updatedAt: D.serverTimestamp()
            });
            await loadNotesAndInstaller();
            await loadStaffPanel('Published team note.');
          } catch (err) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
          }
        });

        staffPanelEl.querySelectorAll('[data-staff-pin-note]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var id = btn.getAttribute('data-staff-pin-note');
            var pinned = btn.getAttribute('data-pinned') === 'true';
            try {
              await D.updateDoc(D.doc(db, 'betaNotes', id), { pinned: !pinned, updatedAt: D.serverTimestamp() });
              await loadNotesAndInstaller();
              await loadStaffPanel(!pinned ? 'Pinned note.' : 'Unpinned note.');
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        staffPanelEl.querySelectorAll('[data-staff-del-note]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var id = btn.getAttribute('data-staff-del-note');
            try {
              await D.deleteDoc(D.doc(db, 'betaNotes', id));
              await loadNotesAndInstaller();
              await loadStaffPanel('Deleted note.');
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        staffPanelEl.querySelectorAll('[data-flag-status]').forEach(function (sel) {
          sel.addEventListener('change', async function () {
            var id = sel.getAttribute('data-flag-status');
            try {
              await D.updateDoc(D.doc(db, 'supportFlags', id), { status: sel.value });
              if (staffMsg) { staffMsg.className = 'status-note'; staffMsg.textContent = 'Updated flag status.'; }
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        staffPanelEl.querySelectorAll('[data-flag-hide-target]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var targetPath = btn.getAttribute('data-flag-hide-target');
            if (!targetPath) return;
            try {
              await D.updateDoc(D.doc(db, targetPath), { hidden: true, updatedAt: D.serverTimestamp() });
              if (staffMsg) { staffMsg.className = 'status-note'; staffMsg.textContent = 'Hidden ' + targetPath; }
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        staffPanelEl.querySelectorAll('[data-flag-del]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var id = btn.getAttribute('data-flag-del');
            try {
              await D.deleteDoc(D.doc(db, 'supportFlags', id));
              await loadStaffPanel('Removed flag.');
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        var testerForm = document.getElementById('staff-tester-form');
        if (testerForm) testerForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var raw = clip(testerForm.elements.namedItem('identifier').value, 320);
          var label = clip(testerForm.elements.namedItem('label').value, 120);
          if (!raw) return;
          if (raw.indexOf('/') >= 0) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = 'Email or UID cannot contain slashes.'; }
            return;
          }
          var isEmail = raw.indexOf('@') >= 0;
          var docId = isEmail ? raw.toLowerCase() : raw;
          if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(docId)) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = 'Enter a valid email address or a user UID.'; }
            return;
          }
          var payload = {
            active: true,
            addedBy: state.user.uid,
            addedAt: D.serverTimestamp(),
            updatedAt: D.serverTimestamp()
          };
          if (isEmail) payload.email = docId;
          else payload.uid = docId;
          if (label) payload.label = label;
          try {
            await D.setDoc(D.doc(db, 'betaTesters', docId), payload);
            await loadStaffPanel('Added beta tester ' + docId + '.');
          } catch (err) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
          }
        });

        staffPanelEl.querySelectorAll('[data-staff-del-tester]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var id = btn.getAttribute('data-staff-del-tester');
            try {
              await D.deleteDoc(D.doc(db, 'betaTesters', id));
              await loadStaffPanel('Removed beta tester ' + id + '.');
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        var inviteForm = document.getElementById('staff-invite-form');
        if (inviteForm) inviteForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var code = clip(inviteForm.elements.namedItem('code').value, 64);
          var label = clip(inviteForm.elements.namedItem('label').value, 120);
          var maxUses = parseInt(inviteForm.elements.namedItem('maxUses').value, 10) || 1;
          if (!/^[A-Za-z0-9_-]{3,64}$/.test(code)) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = 'Invite code must be 3-64 letters, numbers, hyphens, or underscores.'; }
            return;
          }
          if (!label) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = 'Enter a label for the invite code.'; }
            return;
          }
          try {
            await D.setDoc(D.doc(db, 'supportInvites', code), {
              active: true,
              label: label,
              maxUses: Math.max(1, Math.min(100000, maxUses)),
              uses: 0
            });
            await loadStaffPanel('Created invite code ' + code + '.');
          } catch (err) {
            if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
          }
        });

        staffPanelEl.querySelectorAll('[data-staff-toggle-invite]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var code = btn.getAttribute('data-staff-toggle-invite');
            var active = btn.getAttribute('data-active') === 'true';
            try {
              await D.updateDoc(D.doc(db, 'supportInvites', code), { active: !active });
              await loadStaffPanel((!active ? 'Enabled' : 'Disabled') + ' invite code ' + code + '.');
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });

        staffPanelEl.querySelectorAll('[data-staff-del-invite]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var code = btn.getAttribute('data-staff-del-invite');
            try {
              await D.deleteDoc(D.doc(db, 'supportInvites', code));
              await loadStaffPanel('Deleted invite code ' + code + '.');
            } catch (err) {
              if (staffMsg) { staffMsg.className = 'err'; staffMsg.textContent = friendlyError(err); }
            }
          });
        });
      } catch (err) {
        staffPanelEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    async function applyDashboardUser(user) {
      state = await resolveUserState(ctx, user);
      if (!state.user) {
        if (authGateEl) authGateEl.hidden = false;
        if (mainEl) mainEl.hidden = true;
        if (staffPanelEl) staffPanelEl.hidden = true;
        renderAuthGateNote(pendingGateErr, false, ctx);
        pendingGateErr = '';
        return;
      }
      pendingGateErr = '';
      if (!state.isBeta && !state.isStaff) {
        if (authGateEl) authGateEl.hidden = false;
        if (mainEl) mainEl.hidden = true;
        if (staffPanelEl) staffPanelEl.hidden = true;
        renderAuthGateNote('This account (' + (state.user.email || state.displayName) + ') is not on the beta tester list yet.', true, ctx);
        return;
      }
      if (authGateEl) authGateEl.hidden = true;
      if (mainEl) mainEl.hidden = false;
      renderAuthGateNote('', false, ctx);
      renderUserMeta();
      if (osForm) {
        var verEl = getField(osForm, ['osVersion', 'version']) || osForm.querySelector('input, select');
        if (verEl) verEl.value = (state.meta && state.meta.osVersion) || '';
      }
      await Promise.all([
        loadReportsAndNotifications(),
        loadNotesAndInstaller(),
        loadChecklist(),
        loadStaffPanel()
      ]);
    }

    F.onAuthStateChanged(auth, async function (user) {
      if (state.signingIn) return;
      await applyDashboardUser(user);
    });
  }

  async function completeEmailLinkIfPresent(ctx) {
    var F = ctx.F, auth = ctx.auth;
    if (!F.isSignInWithEmailLink(auth, location.href)) return '';
    var email = store('oneclick-email-for-signin') || window.prompt('Enter your email address to finish signing in:') || '';
    email = clip(email, 320);
    if (!email) return '';
    try {
      var cred = await F.signInWithEmailLink(auth, email, location.href);
      store('oneclick-email-for-signin', null);
      history.replaceState(null, '', location.pathname + (isEmulator() ? '?emulator=1' : ''));
      var info = typeof F.getAdditionalUserInfo === 'function' ? F.getAdditionalUserInfo(cred) : null;
      var isNewUser = !!(info && info.isNewUser);
      if (!OPEN_SIGNUPS && isNewUser) {
        var allowed = await isPreApprovedBetaOrStaff(ctx, cred.user);
        if (!allowed) {
          try { await F.deleteUser(cred.user); } catch (eDel) {}
          try { await F.signOut(auth); } catch (eOut) {}
          return 'New accounts are currently closed without beta tester approval.';
        }
      }
      return '';
    } catch (err) {
      return friendlyError(err);
    }
  }

  loadFirebase().then(async function (ctx) {
    var gateErr = await completeEmailLinkIfPresent(ctx);
    startDashboard(ctx, gateErr);
  }).catch(function (err) {
    renderAuthGateNote(friendlyError(err), false, null);
  });
})();
