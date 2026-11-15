/* Support site behaviour. Regular guide pages load zero external scripts and send nothing anywhere.
   Community reports, accounts, and the beta board lazy-load Firebase only on /reports, /account, and /beta. */
(function () {
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- light and dark, same rule as the main site ---------- */
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

  /* ---------- phone menu ---------- */
  var mb = document.getElementById('menu'), top = document.querySelector('header.top');
  if (mb && top) mb.addEventListener('click', function () {
    mb.setAttribute('aria-expanded', String(top.classList.toggle('open')));
  });

  /* ---------- search ---------- */
  var index = null;
  function load() {
    if (!index) index = fetch('/static/index.json').then(function (r) { return r.json(); }).catch(function () { return []; });
    return index;
  }
  function find(list, q) {
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    var hits = [];
    list.forEach(function (a) {
      var t = (a.title || '').toLowerCase(), s = (a.summary || '').toLowerCase(), b = (a.body_text || '').toLowerCase(), score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], k = (t.indexOf(w) >= 0 ? 12 : 0) + (s.indexOf(w) >= 0 ? 5 : 0) + (b.indexOf(w) >= 0 ? 1 : 0);
        if (!k) return;
        score += k;
      }
      hits.push({ a: a, score: score });
    });
    hits.sort(function (x, y) { return y.score - x.score; });
    return hits.map(function (h) { return h.a; });
  }
  function rows(list) {
    return list.map(function (a) {
      return '<a href="' + esc(a.url) + '"><small>' + esc(a.category || '') + '</small><b>' + esc(a.title) + '</b><span>' + esc(a.summary || '') + '</span></a>';
    }).join('');
  }
  var q = document.getElementById('q');
  var live = document.getElementById('live-search');
  var full = document.getElementById('results');
  if (q && full) {
    var status = document.getElementById('search-status'), empty = document.getElementById('empty');
    q.value = new URLSearchParams(location.search).get('q') || '';
    var run = function () {
      load().then(function (list) {
        var term = q.value.trim(), hits = find(list, term);
        full.innerHTML = rows(hits.slice(0, 40));
        status.textContent = !term ? 'Type a word or two. For example: printer, Steam, taskbar.' : hits.length ? hits.length + (hits.length === 1 ? ' guide' : ' guides') + ' for "' + term + '"' : '';
        empty.hidden = !term || hits.length > 0;
        empty.innerHTML = 'Nothing matched "' + esc(term) + '". Try fewer words, or <a href="/reports">tell us what you were looking for</a>.';
      });
    };
    q.addEventListener('input', function () {
      run();
      history.replaceState(null, '', q.value ? '?q=' + encodeURIComponent(q.value) : location.pathname);
    });
    run();
    q.focus();
  } else if (q && live) {
    var show = function () {
      var term = q.value.trim();
      if (term.length < 2) { live.hidden = true; live.innerHTML = ''; return; }
      load().then(function (list) {
        var hits = find(list, term).slice(0, 6);
        live.innerHTML = hits.length ? rows(hits) : '<p class="none">Nothing matched. Try fewer words, or <a href="/reports">tell us what you need</a>.</p>';
        live.hidden = false;
      });
    };
    q.addEventListener('input', show);
    q.addEventListener('focus', show);
    document.addEventListener('click', function (e) { if (!e.target.closest('.search-wrap')) live.hidden = true; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') live.hidden = true; });
  }

  /* ---------- steps you can tick off ---------- */
  document.querySelectorAll('ol.todo').forEach(function (ol, n) {
    var key = 'oneclick-steps:' + location.pathname + ':' + n;
    var items = [].slice.call(ol.children);
    var saved = (store(key) || '').split(',');
    var bar = document.createElement('div');
    bar.className = 'steps-bar';
    bar.innerHTML = '<span class="track"><span class="fill"></span></span><span class="count" aria-live="polite"></span><button type="button" hidden>Start again</button>';
    ol.after(bar);
    var fill = bar.querySelector('.fill'), count = bar.querySelector('.count'), reset = bar.querySelector('button');
    function set(li, on) {
      li.classList.toggle('done', on);
      li.querySelector('.tick').setAttribute('aria-pressed', String(on));
    }
    function update() {
      var done = items.filter(function (li) { return li.classList.contains('done'); }).length;
      fill.style.width = (done / items.length * 100) + '%';
      count.textContent = done === 0 ? 'Tick each step as you go' : done === items.length ? 'All ' + items.length + ' steps done' : done + ' of ' + items.length + ' done';
      reset.hidden = done === 0;
      store(key, done ? items.map(function (li, i) { return li.classList.contains('done') ? i : ''; }).filter(function (v) { return v !== ''; }).join(',') : null);
    }
    items.forEach(function (li, i) {
      if (saved.indexOf(String(i)) >= 0) set(li, true);
      function toggle() { set(li, !li.classList.contains('done')); update(); }
      li.querySelector('.tick').addEventListener('click', toggle);
      li.querySelector('.step-body').addEventListener('click', function (e) { if (!e.target.closest('a') && !String(getSelection())) toggle(); });
    });
    reset.addEventListener('click', function () { items.forEach(function (li) { set(li, false); }); update(); });
    update();
  });

  /* ---------- "On this page": mark the section being read ---------- */
  var links = [].slice.call(document.querySelectorAll('.toc a'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var heads = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var mark = function () {
      var current = heads[0];
      heads.forEach(function (h) { if (h.getBoundingClientRect().top < 140) current = h; });
      links.forEach(function (a) { a.classList.toggle('on', a === map[current.id]); });
    };
    addEventListener('scroll', mark, { passive: true });
    mark();
  }

  /* ---------- private report form (/api/report, same inbox as oneclickos.org/report) ---------- */
  var f = document.getElementById('report');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = f.querySelector('.btn'), old = f.querySelector('.err');
    if (old) old.remove();
    btn.disabled = true; btn.textContent = 'Sending';
    var data = {};
    new FormData(f).forEach(function (v, k) { data[k] = v; });
    fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (out) { if (!r.ok) throw new Error(out.error || 'Could not send'); return out; }); })
      .then(function (out) {
        f.querySelectorAll('label, .btn, #report-note').forEach(function (el) { el.hidden = true; });
        var sent = document.getElementById('sent');
        sent.hidden = false;
        sent.innerHTML = '<h2>Thank you. We have your report.</h2><p>Your reference is <b>' + esc(out.reference) + '</b>.' +
          (out.url ? ' A public copy, without your email, is <a href="' + esc(out.url) + '">issue #' + esc(out.number) + ' on GitHub</a>.' : '') +
          ' If you left an email, we will reply there.</p><button class="btn ghost" type="button" onclick="location.reload()">Send another</button>';
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Send report';
        var p = document.createElement('p');
        p.className = 'err';
        p.textContent = (err && err.message ? err.message : 'Could not send') + ' Please try again in a moment.';
        btn.after(p);
      });
  });

  /* ---------- /reports tabs work synchronously before Firebase loads ---------- */
  var tabComm = document.getElementById('report-tab-community');
  var tabPriv = document.getElementById('report-tab-private');
  var panelComm = document.getElementById('community-panel');
  var panelPriv = document.getElementById('private-panel');
  function switchReportTab(which) {
    var isPriv = which === 'private';
    if (tabComm) tabComm.setAttribute('aria-selected', String(!isPriv));
    if (tabPriv) tabPriv.setAttribute('aria-selected', String(isPriv));
    if (panelComm) panelComm.hidden = isPriv;
    if (panelPriv) panelPriv.hidden = !isPriv;
  }
  if (tabComm && tabPriv && panelComm && panelPriv) {
    tabComm.addEventListener('click', function () { switchReportTab('community'); });
    tabPriv.addEventListener('click', function () { switchReportTab('private'); });
    var qsTab = new URLSearchParams(location.search).get('tab');
    if (qsTab === 'private' || location.hash === '#private') switchReportTab('private');
  }

  /* ---------- /account tabs work synchronously before Firebase loads ---------- */
  var accTabLogin = document.getElementById('acc-tab-login');
  var accTabSignup = document.getElementById('acc-tab-signup');
  var accPanelLogin = document.getElementById('acc-panel-login');
  var accPanelSignup = document.getElementById('acc-panel-signup');
  function switchAccountTab(which) {
    var isSignup = which === 'signup';
    if (accTabLogin) accTabLogin.setAttribute('aria-selected', String(!isSignup));
    if (accTabSignup) accTabSignup.setAttribute('aria-selected', String(isSignup));
    if (accPanelLogin) accPanelLogin.hidden = isSignup;
    if (accPanelSignup) accPanelSignup.hidden = !isSignup;
  }
  if (accTabLogin && accTabSignup && accPanelLogin && accPanelSignup) {
    accTabLogin.addEventListener('click', function () { switchAccountTab('login'); });
    accTabSignup.addEventListener('click', function () { switchAccountTab('signup'); });
    var accQsTab = new URLSearchParams(location.search).get('tab');
    if (accQsTab === 'signup' || location.hash === '#signup') switchAccountTab('signup');
  }

  /* ==========================================================================
     Firebase Apps: Community Reports (/reports), Account (/account), Beta (/beta)
     Lazy-loaded ONLY when one of those 3 containers is on the page.
     ========================================================================== */
  const OPEN_SIGNUPS = false;
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCiN6H0yknBX1ZcFuRmma0N1UWFs1CzM90",
    authDomain: "codecraft-sol.firebaseapp.com",
    projectId: "codecraft-sol",
    appId: "1:82176940262:web:3fd2e1eb941d684c798327"
  };
  var OWNER_EMAIL = "admin@codecraftsol.org";
  var FIREBASE_SDK_BASE = "https://www.gstatic.com/firebasejs/11.6.0";

  var communityEl = document.getElementById('community-reports-app');
  var accountEl = document.getElementById('account-app');
  var betaEl = document.getElementById('beta-board-app');
  if (!communityEl && !accountEl && !betaEl) return;

  var qs = new URLSearchParams(location.search);
  var emuParam = qs.get('emulator');
  if (emuParam === '1' || emuParam === 'true') sstore('oneclick-emulator', '1');
  else if (emuParam === '0' || emuParam === 'false') sstore('oneclick-emulator', null);
  function isEmulator() { return sstore('oneclick-emulator') === '1'; }

  var VALID_CATEGORIES = {
    'getting-started': 'Getting started',
    'desktop': 'Using the desktop',
    'apps': 'Apps',
    'gaming': 'Gaming',
    'settings': 'Settings and hardware',
    'updates': 'Updates and safety',
    'windows': 'Coming from Windows',
    'troubleshooting': 'Fixing problems',
    'general': 'General'
  };
  var VALID_STATUSES = ['new', 'looking', 'fixed', 'not a bug', 'duplicate'];

  /* Mirrors functions/index.js redact() plus home/user path redaction. */
  function redact(text) {
    var n = 0;
    var out = String(text == null ? '' : text)
      .replace(/\/home\/[^/\s]+/g, function () { n++; return '/home/[user]'; })
      .replace(/\/Users\/[^/\s]+/g, function () { n++; return '/Users/[user]'; })
      .replace(/([A-Za-z]:)\\Users\\[^\\\s]+/g, function (_, drv) { n++; return drv + '\\Users\\[user]'; })
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, function () { n++; return '[email removed]'; })
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, function () { n++; return '[address removed]'; })
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, function () { n++; return '[number removed]'; })
      .replace(/\b(?:github_pat_|ghp_|sk-|AIza|xox[bap]-)[A-Za-z0-9_-]{10,}/g, function () { n++; return '[key removed]'; })
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, function () { n++; return '[key removed]'; })
      .replace(/(password|passwd|pwd|pin|passcode)\s*(is|=|:)\s*\S+/gi, function (_, w) { n++; return w + ' [removed]'; });
    return { text: out, n: n };
  }

  function redactLight(text) {
    var n = 0;
    var out = String(text == null ? '' : text)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, function () { n++; return '[email removed]'; })
      .replace(/\b(?:github_pat_|ghp_|sk-|AIza|xox[bap]-)[A-Za-z0-9_-]{10,}/g, function () { n++; return '[key removed]'; })
      .replace(/(password|passwd|pwd|pin|passcode)\s*(is|=|:)\s*\S+/gi, function (_, w) { n++; return w + ' [removed]'; });
    return { text: out, n: n };
  }

  function clip(v, max) { return String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max); }

  function sanitizeDisplayName(raw, fallback) {
    var trimmed = clip(raw, 60);
    if (!trimmed) return { ok: false, text: fallback || 'Tester' };
    var cleaned = redact(trimmed);
    if (cleaned.n > 0 || !cleaned.text) {
      return { ok: false, text: fallback || 'Tester' };
    }
    return { ok: true, text: cleaned.text };
  }

  function safeAuthorName(raw) {
    var s = sanitizeDisplayName(raw, 'Tester');
    return s.ok ? s.text : 'Tester';
  }

  function tsMillis(ts) {
    if (!ts) return Date.now();
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

  function statusBadge(st) {
    var s = st || 'new';
    return '<span class="status-badge status-' + esc(String(s).replace(/\s+/g, '-')) + '" data-status="' + esc(s) + '">' + esc(s) + '</span>';
  }

  function friendlyError(err) {
    var code = err && err.code ? String(err.code) : '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'That email or password did not match.';
    }
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/email-already-in-use') return 'An account with that email already exists. Try signing in instead.';
    if (code === 'auth/weak-password') return 'Please choose a password with at least 8 characters.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
    if (code === 'auth/popup-closed-by-user') return 'The sign-in window was closed before finishing.';
    if (code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled. Please try again.';
    if (code === 'auth/popup-blocked') return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    if (code === 'auth/account-exists-with-different-credential') return 'An account already exists with this email using a different sign-in method.';
    if (code === 'auth/requires-recent-login') return 'For security, please enter your current password (or sign out and back in) and try again.';
    if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found' || code === 'auth/unauthorized-domain') {
      return 'Sign-in is not turned on yet on this site. You can still send a private report without an account.';
    }
    if (code === 'auth/network-request-failed' || code === 'unavailable') {
      return 'Could not reach the server. Check your internet connection and try again.';
    }
    if (code === 'permission-denied') {
      return 'That action is not allowed right now, or you need to wait 10 seconds between new posts.';
    }
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

  function setStatusBox(el, msg, isErr, asHtml) {
    if (!el) return;
    el.hidden = !msg;
    el.className = isErr ? 'err form-status' : 'status-note form-status';
    if (asHtml) el.innerHTML = msg;
    else el.textContent = msg;
  }

  function showFormMsg(form, msg, isErr, asHtml) {
    if (!form) return;
    var box = form.querySelector('.form-status, [data-form-msg]');
    if (!box) {
      box = document.createElement('p');
      box.setAttribute('data-form-msg', '1');
      box.setAttribute('aria-live', 'polite');
      form.appendChild(box);
    }
    setStatusBox(box, msg, isErr, asHtml);
  }

  function clearFormMsg(form) {
    if (!form) return;
    var box = form.querySelector('.form-status, [data-form-msg]');
    if (box) { box.textContent = ''; box.hidden = true; }
  }

  function showOfflineBanner(msg) {
    var target = document.getElementById('comm-auth-bar') || document.getElementById('acc-signed-out') ||
      document.getElementById('beta-gate-signed-out') || communityEl || accountEl || betaEl;
    if (!target) return;
    var p = document.createElement('p');
    p.className = 'err';
    p.textContent = msg;
    target.prepend(p);
  }

  async function loadFirebase() {
    var modApp = await import(FIREBASE_SDK_BASE + '/firebase-app.js');
    var modAuth = await import(FIREBASE_SDK_BASE + '/firebase-auth.js');
    var modFs = await import(FIREBASE_SDK_BASE + '/firebase-firestore.js');
    var app = modApp.getApps().length ? modApp.getApp() : modApp.initializeApp(FIREBASE_CONFIG);
    var auth = modAuth.getAuth(app);
    var db = modFs.getFirestore(app);
    var GoogleAuthProvider = modAuth.GoogleAuthProvider;
    var signInWithPopup = modAuth.signInWithPopup;
    var reauthenticateWithPopup = modAuth.reauthenticateWithPopup;
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
        GoogleAuthProvider: GoogleAuthProvider,
        signInWithPopup: signInWithPopup,
        reauthenticateWithPopup: reauthenticateWithPopup
      }),
      D: modFs
    };
  }

  function hasPasswordProvider(user) {
    return !!(user && user.providerData && user.providerData.some(function (p) { return p && p.providerId === 'password'; }));
  }

  function hasGoogleProvider(user) {
    return !!(user && user.providerData && user.providerData.some(function (p) { return p && p.providerId === 'google.com'; }));
  }

  async function isPreApprovedUser(ctx, user) {
    if (!user) return false;
    var D = ctx.D, db = ctx.db;
    var emailLower = user.email ? user.email.toLowerCase() : '';
    var verifiedEmail = !!(user.emailVerified && emailLower);
    if (emailLower === OWNER_EMAIL && verifiedEmail) return true;
    try {
      var staffSnap = await D.getDoc(D.doc(db, 'oneclickStaff', user.uid));
      if (staffSnap.exists() && staffSnap.data().active !== false) return true;
    } catch (e) {}
    try {
      var uidTester = await D.getDoc(D.doc(db, 'betaTesters', user.uid));
      if (uidTester.exists() && uidTester.data().active !== false) return true;
    } catch (e) {}
    if (verifiedEmail) {
      try {
        var emailTester = await D.getDoc(D.doc(db, 'betaTesters', emailLower));
        if (emailTester.exists() && emailTester.data().active !== false) return true;
      } catch (e) {}
    }
    return false;
  }

  async function cleanupRejectedNewUser(ctx, user, deleteMeta) {
    var F = ctx.F, D = ctx.D, auth = ctx.auth, db = ctx.db;
    if (deleteMeta && user) {
      try { await D.deleteDoc(D.doc(db, 'supportAccountMeta', user.uid)); } catch (eM) {}
    }
    if (user) {
      try { await F.deleteUser(user); } catch (eDel) {}
    }
    try { await F.signOut(auth); } catch (eOut) {}
  }

  async function validateInviteCode(ctx, rawCode) {
    var D = ctx.D, db = ctx.db;
    var code = clip(rawCode, 64);
    if (!code || code.length < 3 || code.indexOf('/') >= 0) return null;
    var ref = D.doc(db, 'supportInvites', code);
    var snap = await D.getDoc(ref);
    if (!snap.exists() && code !== code.toUpperCase()) {
      code = code.toUpperCase();
      ref = D.doc(db, 'supportInvites', code);
      snap = await D.getDoc(ref);
    }
    if (!snap.exists()) return null;
    var d = snap.data();
    if (d.active !== true || d.uses >= d.maxUses) return null;
    return { code: code, ref: ref, data: d };
  }

  async function completeEmailLinkIfPresent(ctx) {
    var F = ctx.F, D = ctx.D, auth = ctx.auth, db = ctx.db;
    if (!F.isSignInWithEmailLink(auth, location.href)) return null;
    var pendingRaw = store('oneclick_pending_invite');
    var pending = null;
    if (pendingRaw) {
      try { pending = JSON.parse(pendingRaw); } catch (e) {}
    }
    var email = store('oneclick-email-for-signin') || (pending && pending.email) || '';
    if (!email) {
      email = window.prompt('Enter your email address to finish signing in:') || '';
    }
    email = clip(email, 320);
    if (!email) return null;
    try {
      var cred = await F.signInWithEmailLink(auth, email, location.href);
      store('oneclick-email-for-signin', null);
      history.replaceState(null, '', location.pathname + (isEmulator() ? '?emulator=1' : ''));

      var info = typeof F.getAdditionalUserInfo === 'function' ? F.getAdditionalUserInfo(cred) : null;
      var isNewUser = !!(info && info.isNewUser);
      var emailLower = cred.user && cred.user.email ? cred.user.email.toLowerCase() : '';
      var verifiedEmail = !!(cred.user && cred.user.emailVerified && emailLower);

      if (!OPEN_SIGNUPS && isNewUser) {
        var authorized = await isPreApprovedUser(ctx, cred.user);
        var createdMeta = false;
        var pendingCode = (pending && pending.email === emailLower && pending.inviteCode) ? pending.inviteCode : '';
        if (!authorized && pendingCode && verifiedEmail) {
          try {
            var invRes = await validateInviteCode(ctx, pendingCode);
            if (invRes) {
              var safeDefaultName = safeAuthorName(emailLower.split('@')[0]);
              await F.updateProfile(cred.user, { displayName: safeDefaultName });
              await D.setDoc(D.doc(db, 'supportAccountMeta', cred.user.uid), {
                displayName: safeDefaultName,
                updatedAt: D.serverTimestamp()
              });
              createdMeta = true;
              await D.updateDoc(invRes.ref, { uses: D.increment(1) });
              authorized = true;
            }
          } catch (eInv) {
            authorized = false;
          }
        }
        store('oneclick_pending_invite', null);
        if (!authorized) {
          await cleanupRejectedNewUser(ctx, cred.user, createdMeta);
          return { msg: 'New accounts are currently closed without a beta invite code.', isErr: true };
        }
      } else {
        store('oneclick_pending_invite', null);
      }
      return null;
    } catch (err) {
      store('oneclick_pending_invite', null);
      return { msg: friendlyError(err), isErr: true };
    }
  }

  async function resolveUserState(ctx, user) {
    var D = ctx.D, db = ctx.db;
    if (!user) {
      return { user: null, isStaff: false, isBeta: false, displayName: '', meta: null };
    }
    var isStaff = false;
    var isBeta = false;
    var meta = null;

    try {
      var token = await user.getIdTokenResult();
      var claims = (token && token.claims) || {};
      if (claims.staff === true) isStaff = true;
      if (claims.betaTester === true) isBeta = true;
    } catch (e) {}

    var emailLower = user.email ? user.email.toLowerCase() : '';
    if (emailLower === OWNER_EMAIL) isStaff = true;

    try {
      var staffSnap = await D.getDoc(D.doc(db, 'oneclickStaff', user.uid));
      if (staffSnap.exists() && staffSnap.data().active !== false) isStaff = true;
    } catch (e) {}

    if (isStaff) isBeta = true;

    if (!isBeta) {
      try {
        var uidTester = await D.getDoc(D.doc(db, 'betaTesters', user.uid));
        if (uidTester.exists() && uidTester.data().active !== false) isBeta = true;
      } catch (e) {}
    }
    if (!isBeta && emailLower) {
      try {
        var emailTester = await D.getDoc(D.doc(db, 'betaTesters', emailLower));
        if (emailTester.exists() && emailTester.data().active !== false) isBeta = true;
      } catch (e) {}
    }

    try {
      var metaSnap = await D.getDoc(D.doc(db, 'supportAccountMeta', user.uid));
      if (metaSnap.exists()) meta = metaSnap.data();
    } catch (e) {}

    var displayName = safeAuthorName((meta && meta.displayName) || user.displayName || 'Tester');
    return { user: user, isStaff: isStaff, isBeta: isBeta, displayName: displayName, meta: meta };
  }

  /* ==================== /reports (Community Reports) ==================== */
  function initCommunityReports(ctx) {
    if (!communityEl) return;
    var D = ctx.D, F = ctx.F, db = ctx.db, auth = ctx.auth;
    var authBar = document.getElementById('comm-auth-bar');
    var catFilter = document.getElementById('comm-filter-cat');
    var statusFilter = document.getElementById('comm-filter-status');
    var newBtn = document.getElementById('comm-new-btn');
    var newForm = document.getElementById('comm-new-form');
    var newStatus = document.getElementById('comm-new-status');
    var listEl = document.getElementById('community-reports-list');
    var threadEl = document.getElementById('comm-thread-view');

    var state = { user: null, isStaff: false, isBeta: false, displayName: '' };
    var allReports = [];
    var activeReportId = new URLSearchParams(location.search).get('report') || '';

    function renderAuthBar() {
      if (!authBar) return;
      if (!state.user) {
        authBar.innerHTML = '<p>Anyone can read public reports. <a href="/account">Sign in on your support account</a> to post or reply. Sign-in is kept separate per web address, so this site and the <a href="https://oneclick-dash.web.app">Beta Tester Dashboard</a> sign in separately.</p>';
        return;
      }
      var badges = '';
      if (state.isStaff) badges += ' <span class="team-badge">OneClick team</span>';
      else if (state.isBeta) badges += ' <span class="role-badge">Beta tester</span>';
      authBar.innerHTML = '<p>Signed in as <strong>' + esc(state.displayName) + '</strong>' + badges +
        ' · <a href="/account">Account</a> · <button type="button" class="link-btn" id="comm-signout-btn">Sign out</button></p>';
      var outBtn = document.getElementById('comm-signout-btn');
      if (outBtn) outBtn.addEventListener('click', function () {
        F.signOut(auth).catch(function (err) { setStatusBox(newStatus, friendlyError(err), true); });
      });
    }

    async function loadReports() {
      if (!listEl) return;
      listEl.innerHTML = '<p class="muted">Loading community reports...</p>';
      try {
        var qRef = state.isStaff
          ? D.query(D.collection(db, 'supportReports'), D.limit(200))
          : D.query(D.collection(db, 'supportReports'), D.where('hidden', '==', false), D.limit(200));
        var snap = await D.getDocs(qRef);
        allReports = snap.docs.map(function (docSnap) {
          var d = docSnap.data();
          d.id = docSnap.id;
          return d;
        }).sort(function (a, b) { return tsMillis(b.createdAt) - tsMillis(a.createdAt); });
        renderList();
        if (activeReportId) {
          var match = allReports.find(function (r) { return r.id === activeReportId; });
          if (match) await openThread(match.id);
        }
      } catch (err) {
        listEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    function renderList() {
      if (!listEl) return;
      var cat = catFilter ? catFilter.value : '';
      var st = statusFilter ? statusFilter.value : '';
      var filtered = allReports.filter(function (r) {
        if (cat && cat !== 'all' && r.category !== cat) return false;
        if (st && st !== 'all' && r.status !== st) return false;
        return true;
      });
      if (!filtered.length) {
        listEl.innerHTML = '<p class="empty">No matching community reports yet.</p>';
        return;
      }
      listEl.innerHTML = filtered.map(function (r) {
        var snippet = r.deleted ? '[deleted]' : clip(r.what, 160);
        var catLabel = VALID_CATEGORIES[r.category] || r.category || 'General';
        var teamTag = r.isTeam ? '<span class="team-badge">OneClick team</span>' : '';
        var replyTeamTag = r.hasTeamReply ? '<span class="team-badge">Team replied</span>' : '';
        var hiddenTag = r.hidden ? '<span class="status-badge">Hidden</span>' : '';
        return '<article class="comm-row" data-report-id="' + esc(r.id) + '">' +
          '<div class="comm-row-head">' +
          '<h3 class="comm-row-title"><button type="button" data-open-report="' + esc(r.id) + '">' + esc(r.title) + '</button></h3>' +
          '<div class="comm-row-meta">' + statusBadge(r.status) + teamTag + replyTeamTag + hiddenTag + '</div>' +
          '</div>' +
          '<p class="comm-row-summary">' + esc(snippet) + '</p>' +
          '<div class="comm-row-meta">' +
          '<span>' + esc(catLabel) + '</span>' +
          '<span>By ' + esc(r.authorName || 'Tester') + '</span>' +
          '<span>' + esc(fmtDate(r.createdAt)) + '</span>' +
          '<span>Same problem: ' + esc(r.sameCount || 0) + '</span>' +
          '<span>Replies: ' + esc(r.replyCount || 0) + '</span>' +
          '</div>' +
          '</article>';
      }).join('');
      listEl.querySelectorAll('[data-open-report]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          openThread(btn.getAttribute('data-open-report'));
        });
      });
    }

    async function openThread(reportId) {
      if (!threadEl) return;
      activeReportId = reportId;
      try {
        var url = new URL(location.href);
        url.searchParams.set('report', reportId);
        history.replaceState(null, '', url.pathname + url.search);
      } catch (e) {}

      threadEl.hidden = false;
      threadEl.innerHTML = '<p class="muted">Loading thread...</p>';

      var r;
      try {
        var snap = await D.getDoc(D.doc(db, 'supportReports', reportId));
        if (!snap.exists()) {
          threadEl.innerHTML = '<p class="err">That report could not be found.</p>';
          return;
        }
        r = snap.data();
        r.id = snap.id;
      } catch (err) {
        threadEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
        return;
      }

      var hasVoted = false;
      if (state.user) {
        try {
          var vSnap = await D.getDoc(D.doc(db, 'supportReports', r.id, 'votes', state.user.uid));
          hasVoted = vSnap.exists();
        } catch (e) {}
      }

      var replies = [];
      try {
        var repQuery = state.isStaff
          ? D.collection(db, 'supportReports', r.id, 'replies')
          : D.query(D.collection(db, 'supportReports', r.id, 'replies'), D.where('hidden', '==', false));
        var repSnap = await D.getDocs(repQuery);
        replies = repSnap.docs.map(function (d) {
          var obj = d.data();
          obj.id = d.id;
          return obj;
        }).sort(function (a, b) { return tsMillis(a.createdAt) - tsMillis(b.createdAt); });
      } catch (err) {}

      var isAuthor = !!(state.user && r.authorUid === state.user.uid && !r.deleted && r.authorUid !== 'deleted');
      var catLabel = VALID_CATEGORIES[r.category] || r.category || 'General';
      var statusOpts = VALID_STATUSES.map(function (st) {
        return '<option value="' + esc(st) + '"' + (r.status === st ? ' selected' : '') + '>' + esc(st) + '</option>';
      }).join('');

      var html = '<div><button type="button" class="btn ghost btn-sm" id="comm-back-btn">Back to all reports</button></div>' +
        '<article class="thread-post">' +
        '<div class="thread-meta">' +
        statusBadge(r.status) +
        '<span>' + esc(catLabel) + '</span>' +
        (r.isTeam ? '<span class="team-badge">OneClick team</span>' : '') +
        (r.hidden ? '<span class="status-badge">Hidden</span>' : '') +
        '<span>By <strong>' + esc(r.authorName || 'Tester') + '</strong></span>' +
        '<span>' + esc(fmtDate(r.createdAt)) + '</span>' +
        '</div>' +
        '<h2>' + esc(r.title) + '</h2>' +
        '<p class="thread-body">' + esc(r.deleted ? '[deleted]' : r.what) + '</p>';

      if ((r.expected && !r.deleted) || r.pc || r.version) {
        html += '<div class="thread-details">';
        if (r.expected && !r.deleted) html += '<div><strong>Expected:</strong> ' + esc(r.expected) + '</div>';
        if (r.pc) html += '<div><strong>Computer:</strong> ' + esc(r.pc) + '</div>';
        if (r.version) html += '<div><strong>OneClick version:</strong> ' + esc(r.version) + '</div>';
        html += '</div>';
      }

      html += '<div class="thread-actions">' +
        '<button type="button" class="same-btn' + (hasVoted ? ' active' : '') + '" id="comm-vote-btn" aria-pressed="' + String(hasVoted) + '">' +
        'Same problem for me (' + esc(r.sameCount || 0) + ')' +
        '</button>' +
        (state.user ? '<button type="button" class="flag-btn" id="comm-flag-report-btn">Flag post</button>' : '') +
        (isAuthor ? '<button type="button" class="link-btn" id="comm-edit-report-btn">Edit</button><button type="button" class="link-btn" id="comm-delete-report-btn">Delete</button>' : '') +
        '</div>' +
        '<p id="comm-thread-msg" class="form-status" aria-live="polite"></p>';

      if (isAuthor) {
        var catOpts = Object.keys(VALID_CATEGORIES).map(function (k) {
          return '<option value="' + esc(k) + '"' + (r.category === k ? ' selected' : '') + '>' + esc(VALID_CATEGORIES[k]) + '</option>';
        }).join('');
        html += '<form id="comm-edit-report-form" class="report comm-form" hidden>' +
          '<label>Title <input name="title" required minlength="3" maxlength="160" value="' + esc(r.title) + '"></label>' +
          '<label>Category <select name="category">' + catOpts + '</select></label>' +
          '<label>What happened? <textarea name="what" rows="4" required minlength="5" maxlength="4000">' + esc(r.what) + '</textarea></label>' +
          '<label>What did you expect? <textarea name="expected" rows="2" maxlength="2000">' + esc(r.expected || '') + '</textarea></label>' +
          '<label>Computer <input name="pc" maxlength="160" value="' + esc(r.pc || '') + '"></label>' +
          '<label>OneClick version <input name="version" maxlength="60" value="' + esc(r.version || '') + '"></label>' +
          '<div class="form-actions"><button type="submit" class="btn btn-sm">Save changes</button><button type="button" class="btn ghost btn-sm" id="comm-edit-cancel">Cancel</button></div>' +
          '</form>';
      }

      if (state.isStaff) {
        html += '<div class="staff-bar">' +
          '<label>Status <select id="comm-staff-status">' + statusOpts + '</select></label>' +
          '<button type="button" class="btn ghost btn-sm" id="comm-staff-save">Update status</button>' +
          '<button type="button" class="btn ghost btn-sm" id="comm-staff-hide">' + (r.hidden ? 'Unhide report' : 'Hide report') + '</button>' +
          '</div>';
      }

      html += '</article><section class="replies-list"><h3>Replies (' + replies.length + ')</h3>';
      if (!replies.length) {
        html += '<p class="muted">No replies yet.</p>';
      } else {
        html += replies.map(function (rep) {
          var repAuthor = !!(state.user && rep.authorUid === state.user.uid && !rep.deleted && rep.authorUid !== 'deleted');
          return '<div class="reply-item' + (rep.isTeam ? ' is-team' : '') + '" data-reply-id="' + esc(rep.id) + '">' +
            '<div class="reply-head"><strong>' + esc(rep.authorName || 'Tester') + '</strong>' +
            (rep.isTeam ? '<span class="team-badge">OneClick team</span>' : '') +
            (rep.hidden ? '<span class="status-badge">Hidden</span>' : '') +
            '<span>' + esc(fmtDate(rep.createdAt)) + '</span></div>' +
            '<p class="reply-body">' + esc(rep.deleted ? '[deleted]' : rep.body) + '</p>' +
            '<div class="reply-actions">' +
            (state.user ? '<button type="button" class="flag-btn" data-flag-reply="' + esc(rep.id) + '">Flag</button>' : '') +
            (repAuthor ? '<button type="button" class="link-btn" data-edit-reply="' + esc(rep.id) + '">Edit</button><button type="button" class="link-btn" data-del-reply="' + esc(rep.id) + '">Delete</button>' : '') +
            (state.isStaff ? '<button type="button" class="link-btn" data-hide-reply="' + esc(rep.id) + '" data-hidden="' + String(!!rep.hidden) + '">' + (rep.hidden ? 'Unhide' : 'Hide') + '</button>' : '') +
            '</div></div>';
        }).join('');
      }

      if (state.user) {
        html += '<form id="comm-reply-form" class="report comm-form">' +
          '<div class="callout warn" role="note"><strong>This is public. Do not put passwords, addresses or phone numbers here.</strong></div>' +
          '<label>Add a reply <textarea name="body" rows="3" required minlength="2" maxlength="2000" placeholder="Share a workaround, extra details, or test result."></textarea></label>' +
          '<button type="submit" class="btn">Post reply</button>' +
          '<p class="form-status" aria-live="polite"></p>' +
          '</form>';
      } else {
        html += '<p class="muted"><a href="/account">Sign in</a> to reply or vote on this report.</p>';
      }
      html += '</section>';

      threadEl.innerHTML = html;

      var msgBox = document.getElementById('comm-thread-msg');
      document.getElementById('comm-back-btn').addEventListener('click', function () {
        activeReportId = '';
        threadEl.hidden = true;
        threadEl.innerHTML = '';
        try {
          var u = new URL(location.href);
          u.searchParams.delete('report');
          history.replaceState(null, '', u.pathname + u.search);
        } catch (e) {}
      });

      var voteBtn = document.getElementById('comm-vote-btn');
      if (voteBtn) voteBtn.addEventListener('click', async function () {
        if (!state.user) {
          setStatusBox(msgBox, 'Please <a href="/account">sign in</a> to vote.', true, true);
          return;
        }
        voteBtn.disabled = true;
        try {
          var vRef = D.doc(db, 'supportReports', r.id, 'votes', state.user.uid);
          var rRef = D.doc(db, 'supportReports', r.id);
          var batch = D.writeBatch(db);
          if (hasVoted) {
            batch.delete(vRef);
            batch.update(rRef, { sameCount: D.increment(-1), updatedAt: D.serverTimestamp() });
          } else {
            batch.set(vRef, { createdAt: D.serverTimestamp() });
            batch.update(rRef, { sameCount: D.increment(1), updatedAt: D.serverTimestamp() });
          }
          await batch.commit();
          await loadReports();
          await openThread(r.id);
        } catch (err) {
          voteBtn.disabled = false;
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var flagReportBtn = document.getElementById('comm-flag-report-btn');
      if (flagReportBtn) flagReportBtn.addEventListener('click', async function () {
        var reason = window.prompt('Why should a moderator look at this report?');
        if (!reason || reason.trim().length < 3) return;
        try {
          await D.addDoc(D.collection(db, 'supportFlags'), {
            targetPath: 'supportReports/' + r.id,
            reason: clip(reason, 500),
            reporterUid: state.user.uid,
            status: 'open',
            createdAt: D.serverTimestamp()
          });
          setStatusBox(msgBox, 'Flag sent to the team. Thank you.', false);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var editBtn = document.getElementById('comm-edit-report-btn');
      var editForm = document.getElementById('comm-edit-report-form');
      if (editBtn && editForm) {
        editBtn.addEventListener('click', function () { editForm.hidden = !editForm.hidden; });
        var editCancel = document.getElementById('comm-edit-cancel');
        if (editCancel) editCancel.addEventListener('click', function () { editForm.hidden = true; });
        editForm.addEventListener('submit', async function (e) {
          e.preventDefault();
          var t = redact(clip(editForm.elements.namedItem('title').value, 160));
          var w = redact(clip(editForm.elements.namedItem('what').value, 4000));
          var ex = redact(clip(editForm.elements.namedItem('expected').value, 2000));
          var pc = redact(clip(editForm.elements.namedItem('pc').value, 160));
          var ver = redactLight(clip(editForm.elements.namedItem('version').value, 60));
          var catVal = editForm.elements.namedItem('category').value;
          var cat = VALID_CATEGORIES[catVal] ? catVal : 'general';
          if (t.text.length < 3 || w.text.length < 5) {
            showFormMsg(editForm, 'Please give a short title and description.', true);
            return;
          }
          try {
            await D.updateDoc(D.doc(db, 'supportReports', r.id), {
              title: t.text,
              category: cat,
              what: w.text,
              expected: ex.text,
              pc: pc.text,
              version: ver.text,
              updatedAt: D.serverTimestamp()
            });
            await loadReports();
            await openThread(r.id);
          } catch (err) {
            showFormMsg(editForm, friendlyError(err), true);
          }
        });
      }

      var delBtn = document.getElementById('comm-delete-report-btn');
      if (delBtn) delBtn.addEventListener('click', async function () {
        if (!window.confirm('Remove your name and text from this report?')) return;
        try {
          await D.updateDoc(D.doc(db, 'supportReports', r.id), {
            authorUid: 'deleted',
            authorName: 'deleted user',
            what: '[deleted]',
            expected: '',
            pc: '',
            deleted: true,
            updatedAt: D.serverTimestamp()
          });
          await loadReports();
          await openThread(r.id);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var staffSave = document.getElementById('comm-staff-save');
      if (staffSave) staffSave.addEventListener('click', async function () {
        var sel = document.getElementById('comm-staff-status');
        if (!sel) return;
        try {
          await D.updateDoc(D.doc(db, 'supportReports', r.id), {
            status: sel.value,
            updatedAt: D.serverTimestamp()
          });
          await loadReports();
          await openThread(r.id);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var staffHide = document.getElementById('comm-staff-hide');
      if (staffHide) staffHide.addEventListener('click', async function () {
        try {
          await D.updateDoc(D.doc(db, 'supportReports', r.id), {
            hidden: !r.hidden,
            updatedAt: D.serverTimestamp()
          });
          await loadReports();
          await openThread(r.id);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      threadEl.querySelectorAll('[data-flag-reply]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var repId = btn.getAttribute('data-flag-reply');
          var reason = window.prompt('Why should a moderator look at this reply?');
          if (!reason || reason.trim().length < 3) return;
          try {
            await D.addDoc(D.collection(db, 'supportFlags'), {
              targetPath: 'supportReports/' + r.id + '/replies/' + repId,
              reason: clip(reason, 500),
              reporterUid: state.user.uid,
              status: 'open',
              createdAt: D.serverTimestamp()
            });
            setStatusBox(msgBox, 'Flag sent to the team.', false);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      threadEl.querySelectorAll('[data-edit-reply]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var repId = btn.getAttribute('data-edit-reply');
          var cur = replies.find(function (x) { return x.id === repId; });
          var nextBody = window.prompt('Edit your reply:', cur ? cur.body : '');
          if (nextBody == null) return;
          var cleaned = redact(clip(nextBody, 2000));
          if (cleaned.text.length < 2) {
            setStatusBox(msgBox, 'Reply must be at least 2 characters.', true);
            return;
          }
          try {
            await D.updateDoc(D.doc(db, 'supportReports', r.id, 'replies', repId), {
              body: cleaned.text,
              updatedAt: D.serverTimestamp()
            });
            await openThread(r.id);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      threadEl.querySelectorAll('[data-del-reply]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!window.confirm('Delete your reply?')) return;
          var repId = btn.getAttribute('data-del-reply');
          try {
            await D.updateDoc(D.doc(db, 'supportReports', r.id, 'replies', repId), {
              authorUid: 'deleted',
              authorName: 'deleted user',
              body: '[deleted]',
              deleted: true,
              updatedAt: D.serverTimestamp()
            });
            await openThread(r.id);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      threadEl.querySelectorAll('[data-hide-reply]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var repId = btn.getAttribute('data-hide-reply');
          var isHid = btn.getAttribute('data-hidden') === 'true';
          try {
            await D.updateDoc(D.doc(db, 'supportReports', r.id, 'replies', repId), {
              hidden: !isHid,
              updatedAt: D.serverTimestamp()
            });
            await openThread(r.id);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      var replyForm = document.getElementById('comm-reply-form');
      if (replyForm) replyForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearFormMsg(replyForm);
        var bodyInp = getField(replyForm, ['body', 'reply']) || replyForm.querySelector('textarea');
        var rawBody = bodyInp ? bodyInp.value : '';
        var cleaned = redact(clip(rawBody, 2000));
        if (cleaned.text.length < 2) {
          showFormMsg(replyForm, 'Please write a short reply before posting.', true);
          return;
        }
        var btn = replyForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        try {
          var repRef = D.doc(D.collection(db, 'supportReports', r.id, 'replies'));
          var batch = D.writeBatch(db);
          batch.set(repRef, {
            authorUid: state.user.uid,
            authorName: safeAuthorName(state.displayName),
            isTeam: state.isStaff,
            body: cleaned.text,
            hidden: false,
            deleted: false,
            flagCount: 0,
            createdAt: D.serverTimestamp(),
            updatedAt: D.serverTimestamp()
          });
          var parentUpd = {
            replyCount: D.increment(1),
            lastReplyAt: D.serverTimestamp(),
            updatedAt: D.serverTimestamp()
          };
          if (state.isStaff) {
            parentUpd.hasTeamReply = true;
            parentUpd.lastTeamReplyAt = D.serverTimestamp();
          }
          batch.update(D.doc(db, 'supportReports', r.id), parentUpd);
          await batch.commit();
          await loadReports();
          await openThread(r.id);
        } catch (err) {
          if (btn) btn.disabled = false;
          showFormMsg(replyForm, friendlyError(err), true);
        }
      });
    }

    if (catFilter) catFilter.addEventListener('change', renderList);
    if (statusFilter) statusFilter.addEventListener('change', renderList);

    if (newBtn && newForm) newBtn.addEventListener('click', function () {
      setStatusBox(newStatus, '', false);
      if (!state.user) {
        newForm.hidden = false;
        setStatusBox(newStatus, 'Please <a href="/account">sign in</a> first to post a public report.', true, true);
        return;
      }
      newForm.hidden = !newForm.hidden;
    });

    if (newForm) newForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      setStatusBox(newStatus, '', false);
      if (!state.user) {
        setStatusBox(newStatus, 'Please <a href="/account">sign in</a> first.', true, true);
        return;
      }
      var hp = getField(newForm, ['website', 'hp']);
      if (hp && hp.value) {
        newForm.reset();
        newForm.hidden = true;
        setStatusBox(newStatus, 'Posted.', false);
        return;
      }
      var titleEl = getField(newForm, ['title', 'comm-title']);
      var catEl = getField(newForm, ['category', 'comm-category']);
      var whatEl = getField(newForm, ['what', 'comm-what']);
      var expEl = getField(newForm, ['expected', 'comm-expected']);
      var pcEl = getField(newForm, ['pc', 'comm-pc']);
      var verEl = getField(newForm, ['version', 'comm-version']);

      var t = redact(clip(titleEl && titleEl.value, 160));
      var w = redact(clip(whatEl && whatEl.value, 4000));
      var ex = redact(clip(expEl && expEl.value, 2000));
      var pc = redact(clip(pcEl && pcEl.value, 160));
      var ver = redactLight(clip(verEl && verEl.value, 60));
      var cat = catEl && VALID_CATEGORIES[catEl.value] ? catEl.value : 'general';

      if (t.text.length < 3 || w.text.length < 5) {
        setStatusBox(newStatus, 'Please add a short title and describe what happened.', true);
        return;
      }

      var submitBtn = newForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        var reportRef = D.doc(D.collection(db, 'supportReports'));
        var rateRef = D.doc(db, 'supportRateLimits', state.user.uid);
        var batch = D.writeBatch(db);
        batch.set(rateRef, { lastPostAt: D.serverTimestamp() });
        batch.set(reportRef, {
          authorUid: state.user.uid,
          authorName: safeAuthorName(state.displayName),
          isTeam: state.isStaff,
          title: t.text,
          what: w.text,
          expected: ex.text,
          pc: pc.text,
          version: ver.text,
          category: cat,
          status: 'new',
          sameCount: 1,
          replyCount: 0,
          hasTeamReply: false,
          lastTeamReplyAt: null,
          hidden: false,
          deleted: false,
          flagCount: 0,
          createdAt: D.serverTimestamp(),
          updatedAt: D.serverTimestamp(),
          lastReplyAt: D.serverTimestamp()
        });
        await batch.commit();
        var redactedCount = t.n + w.n + ex.n + pc.n + ver.n;
        newForm.reset();
        newForm.hidden = true;
        setStatusBox(
          newStatus,
          redactedCount > 0
            ? 'Report posted. ' + redactedCount + ' private item(s) were automatically removed.'
            : 'Report posted.',
          false
        );
        await loadReports();
        await openThread(reportRef.id);
      } catch (err) {
        setStatusBox(newStatus, friendlyError(err), true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    F.onAuthStateChanged(auth, async function (user) {
      state = await resolveUserState(ctx, user);
      renderAuthBar();
      await loadReports();
    });
  }

  /* ==================== /account ==================== */
  function initAccountPage(ctx, emailLinkStatus) {
    if (!accountEl) return;
    var D = ctx.D, F = ctx.F, db = ctx.db, auth = ctx.auth;
    var signedOutEl = document.getElementById('acc-signed-out');
    var signedInEl = document.getElementById('acc-signed-in');
    var signupBanner = document.getElementById('acc-signup-banner');
    var signinForm = document.getElementById('acc-signin-form');
    var emailLinkBtn = document.getElementById('acc-emaillink-btn');
    var googleLoginBtn = document.getElementById('acc-google-login-btn');
    var googleSignupBtn = document.getElementById('acc-google-signup-btn');
    var signupForm = document.getElementById('acc-signup-form');
    var inviteWrap = document.getElementById('acc-invite-wrap');
    var userEmailEl = document.getElementById('acc-user-email');
    var roleBadgeEl = document.getElementById('acc-role-badge');
    var dashLinkEl = document.getElementById('acc-dash-link');
    var profileForm = document.getElementById('acc-profile-form');
    var emailForm = document.getElementById('acc-email-form');
    var passwordForm = document.getElementById('acc-password-form');
    var myReportsEl = document.getElementById('acc-my-reports');
    var signoutBtn = document.getElementById('acc-signout-btn');
    var deleteBtn = document.getElementById('acc-delete-btn');
    var deleteBox = document.getElementById('acc-delete-box');
    var deleteConfirm = document.getElementById('acc-delete-confirm');

    var state = { user: null, isStaff: false, isBeta: false, displayName: '', meta: null, signingUp: false };

    if (signupBanner) signupBanner.hidden = OPEN_SIGNUPS;
    if (inviteWrap) {
      inviteWrap.hidden = OPEN_SIGNUPS;
      var invInp = inviteWrap.querySelector('input');
      if (invInp) invInp.required = !OPEN_SIGNUPS;
    }
    if (emailLinkStatus && emailLinkStatus.msg) {
      if (signinForm) showFormMsg(signinForm, emailLinkStatus.msg, !!emailLinkStatus.isErr);
      else showOfflineBanner(emailLinkStatus.msg);
    }

    if (signinForm) signinForm.addEventListener('submit', async function (e) {
      e.preventDefault();
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
      if (signinForm) clearFormMsg(signinForm);
      var emailEl = signinForm && (getField(signinForm, ['email']) || signinForm.querySelector('input[type="email"]'));
      var email = clip(emailEl && emailEl.value, 320);
      if (!email) {
        if (signinForm) showFormMsg(signinForm, 'Enter your email address first, then press email-link sign-in.', true);
        return;
      }
      var inviteEl = inviteWrap && (inviteWrap.querySelector('input[name="inviteCode"]') || inviteWrap.querySelector('input'));
      var rawCode = clip(inviteEl && inviteEl.value, 64);
      var resolvedCode = '';
      if (!OPEN_SIGNUPS && rawCode) {
        try {
          var invRes = await validateInviteCode(ctx, rawCode);
          if (!invRes) {
            if (signinForm) showFormMsg(signinForm, 'That invite code is not valid or has no uses left.', true);
            return;
          }
          resolvedCode = invRes.code;
        } catch (err) {
          if (signinForm) showFormMsg(signinForm, friendlyError(err), true);
          return;
        }
      }
      try {
        if (!OPEN_SIGNUPS) {
          store('oneclick_pending_invite', JSON.stringify({
            email: email.toLowerCase(),
            inviteCode: resolvedCode
          }));
        }
        var redirectUrl = location.origin + location.pathname + (isEmulator() ? '?emulator=1' : '');
        await F.sendSignInLinkToEmail(auth, email, { url: redirectUrl, handleCodeInApp: true });
        store('oneclick-email-for-signin', email);
        var sentMsg = 'Sign-in link sent. Check your inbox on this device.';
        if (!OPEN_SIGNUPS && !resolvedCode) {
          sentMsg += ' If you do not have an account yet, enter your beta invite code below before requesting an email link. Existing testers can leave it blank.';
        }
        if (signinForm) showFormMsg(signinForm, sentMsg, false);
      } catch (err) {
        if (signinForm) showFormMsg(signinForm, friendlyError(err), true);
      }
    });

    if (signupForm) signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearFormMsg(signupForm);
      var nameEl = getField(signupForm, ['displayName', 'name', 'display-name']) || signupForm.querySelector('input[type="text"]');
      var emailEl = getField(signupForm, ['email']) || signupForm.querySelector('input[type="email"]');
      var passEl = getField(signupForm, ['password']) || signupForm.querySelector('input[type="password"]');
      var inviteEl = inviteWrap && (inviteWrap.querySelector('input[name="inviteCode"]') || getField(signupForm, ['inviteCode', 'invite', 'code']) || inviteWrap.querySelector('input'));

      var rawName = clip(nameEl && nameEl.value, 60);
      var nameCheck = sanitizeDisplayName(rawName, '');
      var email = clip(emailEl && emailEl.value, 320);
      var password = passEl ? passEl.value : '';
      var code = clip(inviteEl && inviteEl.value, 64);

      if (!rawName || !nameCheck.ok) {
        showFormMsg(signupForm, 'Enter a display name without an email address, phone number, IP address, file path, or long key.', true);
        return;
      }
      var displayName = nameCheck.text;
      if (!email || password.length < 8) {
        showFormMsg(signupForm, 'Enter a display name, a valid email, and a password of at least 8 characters.', true);
        return;
      }

      var inviteRef = null;
      if (!OPEN_SIGNUPS) {
        if (!code || code.length < 3) {
          showFormMsg(signupForm, 'An invite code is required while sign-ups are closed to the public.', true);
          return;
        }
        try {
          var invRes = await validateInviteCode(ctx, code);
          if (!invRes) {
            showFormMsg(signupForm, 'That invite code is not valid or has no uses left.', true);
            return;
          }
          inviteRef = invRes.ref;
        } catch (err) {
          showFormMsg(signupForm, friendlyError(err), true);
          return;
        }
      }

      var btn = signupForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      var cred = null;
      state.signingUp = true;
      try {
        cred = await F.createUserWithEmailAndPassword(auth, email, password);
        await F.updateProfile(cred.user, { displayName: displayName });
        await D.setDoc(D.doc(db, 'supportAccountMeta', cred.user.uid), {
          displayName: displayName,
          updatedAt: D.serverTimestamp()
        });
        if (!OPEN_SIGNUPS && inviteRef) {
          await D.updateDoc(inviteRef, { uses: D.increment(1) });
        }
        signupForm.reset();
      } catch (err) {
        await cleanupRejectedNewUser(ctx, cred && cred.user, !!(cred && cred.user));
        showFormMsg(signupForm, friendlyError(err), true);
      } finally {
        state.signingUp = false;
        if (btn) btn.disabled = false;
        await applyAuthUser(auth.currentUser);
      }
    });

    async function handleGoogleAuth(mode) {
      if (signinForm) clearFormMsg(signinForm);
      if (signupForm) clearFormMsg(signupForm);
      var isSignup = mode === 'signup';
      var activeBtn = isSignup ? googleSignupBtn : googleLoginBtn;
      var msgForm = isSignup ? signupForm : signinForm;

      var customName = '';
      var inviteRef = null;
      if (isSignup) {
        var nameEl = signupForm && (getField(signupForm, ['displayName', 'name', 'display-name']) || signupForm.querySelector('input[type="text"]'));
        var rawName = clip(nameEl && nameEl.value, 60);
        if (rawName) {
          var nameCheck = sanitizeDisplayName(rawName, '');
          if (!nameCheck.ok) {
            if (signupForm) showFormMsg(signupForm, 'Enter a display name without an email address, phone number, IP address, file path, or long key.', true);
            return;
          }
          customName = nameCheck.text;
        }
        if (!OPEN_SIGNUPS) {
          var inviteEl = inviteWrap && (inviteWrap.querySelector('input[name="inviteCode"]') || (signupForm && getField(signupForm, ['inviteCode', 'invite', 'code'])) || inviteWrap.querySelector('input'));
          var code = clip(inviteEl && inviteEl.value, 64);
          if (!code || code.length < 3) {
            if (signupForm) showFormMsg(signupForm, 'An invite code is required while sign-ups are closed to the public.', true);
            return;
          }
          try {
            var invRes = await validateInviteCode(ctx, code);
            if (!invRes) {
              if (signupForm) showFormMsg(signupForm, 'That invite code is not valid or has no uses left.', true);
              return;
            }
            inviteRef = invRes.ref;
          } catch (err) {
            if (signupForm) showFormMsg(signupForm, friendlyError(err), true);
            return;
          }
        }
      }

      if (activeBtn) activeBtn.disabled = true;
      state.signingUp = true;
      var cred = null;
      var isNewUser = false;
      var createdMeta = false;
      try {
        var provider = new F.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        cred = await F.signInWithPopup(auth, provider);
        var info = typeof F.getAdditionalUserInfo === 'function' ? F.getAdditionalUserInfo(cred) : null;
        isNewUser = !!(info && info.isNewUser);

        if (!OPEN_SIGNUPS && isNewUser) {
          var authorized = await isPreApprovedUser(ctx, cred.user);
          if (!authorized && !(isSignup && inviteRef)) {
            await cleanupRejectedNewUser(ctx, cred.user, false);
            if (!isSignup) {
              switchAccountTab('signup');
              if (signupForm) {
                showFormMsg(signupForm, 'New accounts are currently closed without a beta invite code. Enter your invite code above and choose Create account with Google.', true);
              } else if (signinForm) {
                showFormMsg(signinForm, 'New accounts are currently closed without a beta invite code.', true);
              }
            } else if (signupForm) {
              showFormMsg(signupForm, 'New accounts are currently closed without a beta invite code.', true);
            }
            return;
          }
        }

        var metaRef = D.doc(db, 'supportAccountMeta', cred.user.uid);
        var metaSnap = await D.getDoc(metaRef);
        if (!metaSnap.exists()) {
          var emailPrefix = (cred.user.email || '').split('@')[0];
          var chosenName = customName || safeAuthorName(cred.user.displayName || emailPrefix || 'Tester');
          if (chosenName !== cred.user.displayName) {
            await F.updateProfile(cred.user, { displayName: chosenName });
          }
          await D.setDoc(metaRef, {
            displayName: chosenName,
            updatedAt: D.serverTimestamp()
          });
          createdMeta = true;
        }
        if (isNewUser && !OPEN_SIGNUPS && inviteRef) {
          await D.updateDoc(inviteRef, { uses: D.increment(1) });
        }
        if (isSignup && signupForm) signupForm.reset();
      } catch (err) {
        if (isNewUser && cred && cred.user) {
          await cleanupRejectedNewUser(ctx, cred.user, createdMeta);
        }
        if (msgForm) showFormMsg(msgForm, friendlyError(err), true);
      } finally {
        state.signingUp = false;
        if (activeBtn) activeBtn.disabled = false;
        await applyAuthUser(auth.currentUser);
      }
    }

    if (googleLoginBtn) googleLoginBtn.addEventListener('click', function () {
      handleGoogleAuth('login');
    });
    if (googleSignupBtn) googleSignupBtn.addEventListener('click', function () {
      handleGoogleAuth('signup');
    });

    if (profileForm) profileForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!state.user) return;
      clearFormMsg(profileForm);
      var nameEl = getField(profileForm, ['displayName', 'name', 'display-name']) || profileForm.querySelector('input');
      var rawNext = clip(nameEl && nameEl.value, 60);
      var nameCheck = sanitizeDisplayName(rawNext, '');
      if (!rawNext || !nameCheck.ok) {
        showFormMsg(profileForm, 'Enter a display name without an email address, phone number, IP address, file path, or long key.', true);
        return;
      }
      var nextName = nameCheck.text;
      try {
        await F.updateProfile(state.user, { displayName: nextName });
        await D.setDoc(D.doc(db, 'supportAccountMeta', state.user.uid), {
          displayName: nextName,
          updatedAt: D.serverTimestamp()
        }, { merge: true });
        state.displayName = nextName;
        if (nameEl) nameEl.value = nextName;
        showFormMsg(profileForm, 'Display name saved.', false);
      } catch (err) {
        showFormMsg(profileForm, friendlyError(err), true);
      }
    });

    if (emailForm) emailForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!state.user) return;
      clearFormMsg(emailForm);
      var emailEl = getField(emailForm, ['email', 'newEmail']) || emailForm.querySelector('input[type="email"]');
      var passEl = getField(emailForm, ['currentPassword', 'password']) || emailForm.querySelector('input[type="password"]');
      var nextEmail = clip(emailEl && emailEl.value, 320);
      var curPass = passEl ? passEl.value : '';
      if (!nextEmail) {
        showFormMsg(emailForm, 'Enter the new email address.', true);
        return;
      }
      try {
        if (curPass && state.user.email) {
          var cred = F.EmailAuthProvider.credential(state.user.email, curPass);
          await F.reauthenticateWithCredential(state.user, cred);
        }
        if (isEmulator()) {
          await F.updateEmail(state.user, nextEmail);
          if (userEmailEl) userEmailEl.textContent = nextEmail;
          showFormMsg(emailForm, 'Email address updated.', false);
        } else {
          try {
            await F.verifyBeforeUpdateEmail(state.user, nextEmail);
            showFormMsg(emailForm, 'Check your new email address for a confirmation link to finish the change.', false);
          } catch (vErr) {
            if (vErr && vErr.code === 'auth/operation-not-allowed') {
              await F.updateEmail(state.user, nextEmail);
              if (userEmailEl) userEmailEl.textContent = nextEmail;
              showFormMsg(emailForm, 'Email address updated.', false);
            } else {
              throw vErr;
            }
          }
        }
      } catch (err) {
        showFormMsg(emailForm, friendlyError(err), true);
      }
    });

    if (passwordForm) passwordForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!state.user) return;
      clearFormMsg(passwordForm);
      var passInputs = [].slice.call(passwordForm.querySelectorAll('input[type="password"]'));
      var curEl = getField(passwordForm, ['currentPassword', 'oldPassword']) || (passInputs.length > 1 ? passInputs[0] : null);
      var newEl = getField(passwordForm, ['newPassword', 'password']) || (passInputs.length > 1 ? passInputs[1] : passInputs[0]);
      var curPass = curEl ? curEl.value : '';
      var newPass = newEl ? newEl.value : '';
      if (newPass.length < 8) {
        showFormMsg(passwordForm, 'New password must be at least 8 characters.', true);
        return;
      }
      try {
        if (curPass && state.user.email) {
          var cred = F.EmailAuthProvider.credential(state.user.email, curPass);
          await F.reauthenticateWithCredential(state.user, cred);
        }
        await F.updatePassword(state.user, newPass);
        passwordForm.reset();
        showFormMsg(passwordForm, 'Password updated.', false);
      } catch (err) {
        showFormMsg(passwordForm, friendlyError(err), true);
      }
    });

    if (signoutBtn) signoutBtn.addEventListener('click', function () {
      F.signOut(auth).catch(function () {});
    });

    function showDeleteError(msg) {
      var msgTarget = document.getElementById('acc-delete-status') || deleteBox || (deleteConfirm && deleteConfirm.parentElement) || signedInEl;
      if (!msgTarget) return;
      if (msgTarget.id === 'acc-delete-status') {
        setStatusBox(msgTarget, msg, true);
        return;
      }
      var p = msgTarget.querySelector('[data-del-err]') || document.createElement('p');
      p.className = 'err';
      p.setAttribute('data-del-err', '1');
      p.textContent = msg;
      msgTarget.appendChild(p);
    }

    function clearDeleteError() {
      var st = document.getElementById('acc-delete-status');
      if (st) { st.textContent = ''; st.hidden = true; }
      document.querySelectorAll('[data-del-err]').forEach(function (el) { el.remove(); });
    }

    async function runDeleteAccount() {
      if (!state.user) return;
      clearDeleteError();
      var uid = state.user.uid;
      var passInp = document.getElementById('acc-delete-password') ||
        (deleteBox && deleteBox.querySelector('input[type="password"]')) ||
        (deleteConfirm && deleteConfirm.querySelector('input[type="password"]'));
      var curPass = passInp ? passInp.value : '';
      var hasPw = hasPasswordProvider(state.user);
      var hasGoogle = hasGoogleProvider(state.user);

      try {
        // 1. Re-authenticate / verify recent session BEFORE touching any Firestore docs.
        if (hasPw && state.user.email) {
          if (!curPass) {
            if (passInp) {
              showDeleteError('Enter your current password to confirm deleting your account.');
              passInp.focus();
              return;
            }
            curPass = window.prompt('Enter your current password to permanently delete your account:') || '';
            if (!curPass) return;
          }
          var cred = F.EmailAuthProvider.credential(state.user.email, curPass);
          await F.reauthenticateWithCredential(state.user, cred);
        } else {
          var lastSignInMs = Date.parse((state.user.metadata && state.user.metadata.lastSignInTime) || '');
          var isRecent = !!(lastSignInMs && !isNaN(lastSignInMs) && (Date.now() - lastSignInMs) <= 4 * 60 * 1000);
          if (!isRecent) {
            if (hasGoogle) {
              var provider = new F.GoogleAuthProvider();
              await F.reauthenticateWithPopup(state.user, provider);
            } else {
              showDeleteError('For your security, sign out and sign back in with a fresh email link before deleting your account.');
              return;
            }
          }
        }

        // 2. Anonymize public supportReports & replies, betaPosts & replies, and remove private user docs.
        var repQuery = state.isStaff
          ? D.collection(db, 'supportReports')
          : D.query(D.collection(db, 'supportReports'), D.where('hidden', '==', false));
        var reportsSnap = await D.getDocs(repQuery);
        for (var i = 0; i < reportsSnap.docs.length; i++) {
          var rDoc = reportsSnap.docs[i];
          var rData = rDoc.data();
          var subQ = state.isStaff
            ? D.collection(db, 'supportReports', rDoc.id, 'replies')
            : D.query(D.collection(db, 'supportReports', rDoc.id, 'replies'), D.where('hidden', '==', false));
          var subSnap = await D.getDocs(subQ);
          for (var j = 0; j < subSnap.docs.length; j++) {
            var repDoc = subSnap.docs[j];
            if (repDoc.data().authorUid === uid && !repDoc.data().deleted) {
              await D.updateDoc(D.doc(db, 'supportReports', rDoc.id, 'replies', repDoc.id), {
                authorUid: 'deleted',
                authorName: 'deleted user',
                body: '[deleted]',
                deleted: true,
                updatedAt: D.serverTimestamp()
              });
            }
          }
          if (rData.authorUid === uid && !rData.deleted) {
            await D.updateDoc(D.doc(db, 'supportReports', rDoc.id), {
              authorUid: 'deleted',
              authorName: 'deleted user',
              what: '[deleted]',
              expected: '',
              pc: '',
              deleted: true,
              updatedAt: D.serverTimestamp()
            });
          }
        }

        if (state.isBeta) {
          try {
            var betaSnap = await D.getDocs(D.collection(db, 'betaPosts'));
            for (var b = 0; b < betaSnap.docs.length; b++) {
              var bDoc = betaSnap.docs[b];
              var bSub = await D.getDocs(D.collection(db, 'betaPosts', bDoc.id, 'replies'));
              for (var br = 0; br < bSub.docs.length; br++) {
                if (bSub.docs[br].data().authorUid === uid && !bSub.docs[br].data().deleted) {
                  await D.updateDoc(D.doc(db, 'betaPosts', bDoc.id, 'replies', bSub.docs[br].id), {
                    authorUid: 'deleted',
                    authorName: 'deleted user',
                    body: '[deleted]',
                    deleted: true,
                    updatedAt: D.serverTimestamp()
                  });
                }
              }
              if (bDoc.data().authorUid === uid && !bDoc.data().deleted) {
                await D.updateDoc(D.doc(db, 'betaPosts', bDoc.id), {
                  authorUid: 'deleted',
                  authorName: 'deleted user',
                  body: '[deleted]',
                  pc: '',
                  deleted: true,
                  updatedAt: D.serverTimestamp()
                });
              }
            }
            var checksSnap = await D.getDocs(D.collection(db, 'betaChecks'));
            for (var c = 0; c < checksSnap.docs.length; c++) {
              if (checksSnap.docs[c].data().uid === uid) {
                await D.deleteDoc(D.doc(db, 'betaChecks', checksSnap.docs[c].id));
              }
            }
          } catch (eBeta) {}
        }

        try { await D.deleteDoc(D.doc(db, 'supportAccountMeta', uid)); } catch (eMeta) {}
        try { await D.deleteDoc(D.doc(db, 'supportRateLimits', uid)); } catch (eRate) {}

        // 3. Delete Firebase Auth account.
        await F.deleteUser(state.user);
      } catch (err) {
        showDeleteError(friendlyError(err));
      }
    }

    if (deleteBtn && (deleteBox || deleteConfirm)) {
      deleteBtn.addEventListener('click', function () {
        clearDeleteError();
        if (deleteBox) {
          deleteBox.hidden = !deleteBox.hidden;
          if (deleteConfirm) deleteConfirm.hidden = false;
        } else if (deleteConfirm) {
          deleteConfirm.hidden = !deleteConfirm.hidden;
        }
      });
      if (deleteConfirm && deleteConfirm.tagName === 'BUTTON') {
        deleteConfirm.addEventListener('click', runDeleteAccount);
      } else if (deleteConfirm && deleteConfirm.tagName === 'FORM') {
        deleteConfirm.addEventListener('submit', function (e) { e.preventDefault(); runDeleteAccount(); });
      } else if (deleteConfirm) {
        var confirmTrigger = deleteConfirm.querySelector('[data-confirm], button[type="submit"], button.btn-danger, button:not([data-cancel])');
        if (confirmTrigger) confirmTrigger.addEventListener('click', runDeleteAccount);
      }
      var cancelBtn = (deleteBox && deleteBox.querySelector('[data-cancel], #acc-delete-cancel')) ||
        (deleteConfirm && deleteConfirm.querySelector('[data-cancel]'));
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          clearDeleteError();
          if (deleteBox) deleteBox.hidden = true;
          else if (deleteConfirm) deleteConfirm.hidden = true;
        });
      }
    } else if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (window.confirm('Delete your account and anonymize your posts to "deleted user"?')) runDeleteAccount();
      });
    }

    async function loadMyReports(uid) {
      if (!myReportsEl) return;
      myReportsEl.innerHTML = '<p class="muted">Loading your reports...</p>';
      try {
        var qRef = state.isStaff
          ? D.collection(db, 'supportReports')
          : D.query(D.collection(db, 'supportReports'), D.where('hidden', '==', false));
        var snap = await D.getDocs(qRef);
        var mine = snap.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        }).filter(function (r) { return r.authorUid === uid && !r.deleted; })
          .sort(function (a, b) { return tsMillis(b.createdAt) - tsMillis(a.createdAt); });

        if (!mine.length) {
          myReportsEl.innerHTML = '<p class="muted">You have not posted any public reports yet. <a href="/reports">Open reports</a>.</p>';
          return;
        }
        myReportsEl.innerHTML = '<div class="comm-list">' + mine.map(function (r) {
          return '<div class="comm-row">' +
            '<div class="comm-row-head">' +
            '<h3 class="comm-row-title"><a href="/reports?report=' + esc(r.id) + '">' + esc(r.title) + '</a></h3>' +
            '<div class="comm-row-meta">' + statusBadge(r.status) +
            (r.hasTeamReply ? '<span class="team-badge">Team replied</span>' : '') + '</div>' +
            '</div>' +
            '<div class="comm-row-meta"><span>' + esc(fmtDate(r.createdAt)) + '</span><span>Replies: ' + esc(r.replyCount || 0) + '</span><span>Same problem: ' + esc(r.sameCount || 0) + '</span></div>' +
            '</div>';
        }).join('') + '</div>';
      } catch (err) {
        myReportsEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    async function applyAuthUser(user) {
      state = await resolveUserState(ctx, user);
      if (signedOutEl) signedOutEl.hidden = !!state.user;
      if (signedInEl) signedInEl.hidden = !state.user;
      if (!state.user) {
        if (myReportsEl) myReportsEl.innerHTML = '';
        return;
      }
      if (userEmailEl) userEmailEl.textContent = state.user.email || state.displayName;
      if (roleBadgeEl) {
        roleBadgeEl.hidden = !(state.isStaff || state.isBeta);
        roleBadgeEl.textContent = state.isStaff ? 'OneClick team' : (state.isBeta ? 'Beta tester' : '');
      }
      if (dashLinkEl) dashLinkEl.hidden = !(state.isStaff || state.isBeta);
      if (profileForm) {
        var nameEl = getField(profileForm, ['displayName', 'name', 'display-name']) || profileForm.querySelector('input');
        if (nameEl) nameEl.value = state.displayName;
      }
      if (emailForm) {
        var emEl = getField(emailForm, ['newEmail', 'email']) || emailForm.querySelector('input[type="email"]');
        if (emEl) emEl.placeholder = state.user.email || '';
      }
      var usesPassword = hasPasswordProvider(state.user);
      if (emailForm) emailForm.hidden = !usesPassword;
      if (passwordForm) passwordForm.hidden = !usesPassword;
      var delPwWrap = document.getElementById('acc-delete-password-wrap');
      if (delPwWrap) delPwWrap.hidden = !usesPassword;
      if (deleteBox) deleteBox.hidden = true;
      if (deleteConfirm && !deleteBox) deleteConfirm.hidden = true;
      var delPwEl = document.getElementById('acc-delete-password');
      if (delPwEl) delPwEl.value = '';
      await loadMyReports(state.user.uid);
    }

    F.onAuthStateChanged(auth, async function (user) {
      if (state.signingUp) return;
      await applyAuthUser(user);
    });
  }

  /* ==================== /beta (Private Beta Board) ==================== */
  function initBetaBoard(ctx) {
    if (!betaEl) return;
    var D = ctx.D, F = ctx.F, db = ctx.db, auth = ctx.auth;
    var gateSignedOut = document.getElementById('beta-gate-signed-out');
    var gateNotTester = document.getElementById('beta-gate-not-tester');
    var panelEl = document.getElementById('beta-panel');
    var newPostForm = document.getElementById('beta-new-post-form');
    var newStatus = document.getElementById('beta-new-status');
    var postsListEl = document.getElementById('beta-posts-list');
    var threadEl = document.getElementById('beta-thread-view');

    var state = { user: null, isStaff: false, isBeta: false, displayName: '' };
    var posts = [];

    async function loadPosts() {
      if (!postsListEl) return;
      postsListEl.innerHTML = '<p class="muted">Loading beta board...</p>';
      try {
        var snap = await D.getDocs(D.collection(db, 'betaPosts'));
        posts = snap.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        }).filter(function (p) { return !p.hidden || state.isStaff; })
          .sort(function (a, b) { return tsMillis(b.createdAt) - tsMillis(a.createdAt); });

        if (!posts.length) {
          postsListEl.innerHTML = '<p class="empty">No beta notes or discussions yet.</p>';
          return;
        }
        postsListEl.innerHTML = posts.map(function (p) {
          return '<article class="comm-row">' +
            '<div class="comm-row-head">' +
            '<h3 class="comm-row-title"><button type="button" data-open-beta="' + esc(p.id) + '">' + esc(p.title) + '</button></h3>' +
            '<div class="comm-row-meta">' +
            (p.isTeam ? '<span class="team-badge">OneClick team</span>' : '') +
            (p.version ? '<span class="status-badge">' + esc(p.version) + '</span>' : '') +
            (p.hidden ? '<span class="status-badge">Hidden</span>' : '') +
            '</div>' +
            '</div>' +
            '<p class="comm-row-summary">' + esc(p.deleted ? '[deleted]' : clip(p.body, 160)) + '</p>' +
            '<div class="comm-row-meta"><span>By ' + esc(p.authorName || 'Tester') + '</span><span>' + esc(fmtDate(p.createdAt)) + '</span><span>Replies: ' + esc(p.replyCount || 0) + '</span></div>' +
            '</article>';
        }).join('');
        postsListEl.querySelectorAll('[data-open-beta]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            openBetaThread(btn.getAttribute('data-open-beta'));
          });
        });
      } catch (err) {
        postsListEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
      }
    }

    async function openBetaThread(postId) {
      if (!threadEl) return;
      threadEl.hidden = false;
      threadEl.innerHTML = '<p class="muted">Loading post...</p>';
      var p;
      try {
        var snap = await D.getDoc(D.doc(db, 'betaPosts', postId));
        if (!snap.exists()) {
          threadEl.innerHTML = '<p class="err">Post not found.</p>';
          return;
        }
        p = snap.data();
        p.id = snap.id;
      } catch (err) {
        threadEl.innerHTML = '<p class="err">' + esc(friendlyError(err)) + '</p>';
        return;
      }

      var replies = [];
      try {
        var rSnap = await D.getDocs(D.collection(db, 'betaPosts', p.id, 'replies'));
        replies = rSnap.docs.map(function (d) {
          var o = d.data();
          o.id = d.id;
          return o;
        }).filter(function (r) { return !r.hidden || state.isStaff; })
          .sort(function (a, b) { return tsMillis(a.createdAt) - tsMillis(b.createdAt); });
      } catch (err) {}

      var isAuthor = !!(state.user && p.authorUid === state.user.uid && !p.deleted && p.authorUid !== 'deleted');
      var html = '<div><button type="button" class="btn ghost btn-sm" id="beta-back-btn">Back to posts</button></div>' +
        '<article class="thread-post">' +
        '<div class="thread-meta">' +
        (p.isTeam ? '<span class="team-badge">OneClick team</span>' : '') +
        (p.version ? '<span class="status-badge">' + esc(p.version) + '</span>' : '') +
        '<span>By <strong>' + esc(p.authorName || 'Tester') + '</strong></span>' +
        '<span>' + esc(fmtDate(p.createdAt)) + '</span>' +
        (!p.deleted && p.pc ? '<span>PC: ' + esc(p.pc) + '</span>' : '') +
        '</div>' +
        '<h2>' + esc(p.title) + '</h2>' +
        '<p class="thread-body">' + esc(p.deleted ? '[deleted]' : p.body) + '</p>' +
        '<div class="thread-actions">' +
        '<button type="button" class="flag-btn" id="beta-flag-btn">Flag post</button>' +
        (isAuthor ? '<button type="button" class="link-btn" id="beta-edit-btn">Edit</button><button type="button" class="link-btn" id="beta-del-btn">Delete</button>' : '') +
        (state.isStaff ? '<button type="button" class="btn ghost btn-sm" id="beta-hide-btn">' + (p.hidden ? 'Unhide' : 'Hide') + '</button>' : '') +
        '</div>' +
        '<p id="beta-thread-msg" class="form-status" aria-live="polite"></p>' +
        '</article>' +
        '<section class="replies-list"><h3>Replies (' + replies.length + ')</h3>';

      if (!replies.length) {
        html += '<p class="muted">No replies yet.</p>';
      } else {
        html += replies.map(function (rep) {
          var repAuthor = !!(state.user && rep.authorUid === state.user.uid && !rep.deleted && rep.authorUid !== 'deleted');
          return '<div class="reply-item' + (rep.isTeam ? ' is-team' : '') + '"><div class="reply-head"><strong>' + esc(rep.authorName || 'Tester') + '</strong>' +
            (rep.isTeam ? '<span class="team-badge">OneClick team</span>' : '') +
            '<span>' + esc(fmtDate(rep.createdAt)) + '</span></div>' +
            '<p class="reply-body">' + esc(rep.deleted ? '[deleted]' : rep.body) + '</p>' +
            '<div class="reply-actions">' +
            (repAuthor ? '<button type="button" class="link-btn" data-beta-edit-rep="' + esc(rep.id) + '">Edit</button><button type="button" class="link-btn" data-beta-del-rep="' + esc(rep.id) + '">Delete</button>' : '') +
            (state.isStaff ? '<button type="button" class="link-btn" data-beta-hide-rep="' + esc(rep.id) + '" data-hidden="' + String(!!rep.hidden) + '">' + (rep.hidden ? 'Unhide' : 'Hide') + '</button>' : '') +
            '</div></div>';
        }).join('');
      }

      html += '<form id="beta-reply-form" class="report comm-form">' +
        '<label>Reply <textarea name="body" rows="3" required minlength="2" maxlength="2000"></textarea></label>' +
        '<button type="submit" class="btn">Post reply</button>' +
        '<p class="form-status" aria-live="polite"></p>' +
        '</form></section>';

      threadEl.innerHTML = html;
      var msgBox = document.getElementById('beta-thread-msg');

      document.getElementById('beta-back-btn').addEventListener('click', function () {
        threadEl.hidden = true;
        threadEl.innerHTML = '';
      });

      var flagBtn = document.getElementById('beta-flag-btn');
      if (flagBtn) flagBtn.addEventListener('click', async function () {
        var reason = window.prompt('Reason for flagging:');
        if (!reason || reason.trim().length < 3) return;
        try {
          await D.addDoc(D.collection(db, 'supportFlags'), {
            targetPath: 'betaPosts/' + p.id,
            reason: clip(reason, 500),
            reporterUid: state.user.uid,
            status: 'open',
            createdAt: D.serverTimestamp()
          });
          setStatusBox(msgBox, 'Flag sent to the team.', false);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var editBtn = document.getElementById('beta-edit-btn');
      if (editBtn) editBtn.addEventListener('click', async function () {
        var nextBody = window.prompt('Update post text:', p.body);
        if (nextBody == null) return;
        var cleaned = redact(clip(nextBody, 4000));
        if (cleaned.text.length < 2) return;
        try {
          await D.updateDoc(D.doc(db, 'betaPosts', p.id), { body: cleaned.text, updatedAt: D.serverTimestamp() });
          await loadPosts();
          await openBetaThread(p.id);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var delBtn = document.getElementById('beta-del-btn');
      if (delBtn) delBtn.addEventListener('click', async function () {
        if (!window.confirm('Delete this post?')) return;
        try {
          await D.updateDoc(D.doc(db, 'betaPosts', p.id), {
            authorUid: 'deleted',
            authorName: 'deleted user',
            body: '[deleted]',
            pc: '',
            deleted: true,
            updatedAt: D.serverTimestamp()
          });
          await loadPosts();
          await openBetaThread(p.id);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      var hideBtn = document.getElementById('beta-hide-btn');
      if (hideBtn) hideBtn.addEventListener('click', async function () {
        try {
          await D.updateDoc(D.doc(db, 'betaPosts', p.id), { hidden: !p.hidden, updatedAt: D.serverTimestamp() });
          await loadPosts();
          await openBetaThread(p.id);
        } catch (err) {
          setStatusBox(msgBox, friendlyError(err), true);
        }
      });

      threadEl.querySelectorAll('[data-beta-edit-rep]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var repId = btn.getAttribute('data-beta-edit-rep');
          var cur = replies.find(function (x) { return x.id === repId; });
          var nextBody = window.prompt('Edit reply:', cur ? cur.body : '');
          if (nextBody == null) return;
          var cleaned = redact(clip(nextBody, 2000));
          if (cleaned.text.length < 2) return;
          try {
            await D.updateDoc(D.doc(db, 'betaPosts', p.id, 'replies', repId), {
              body: cleaned.text,
              updatedAt: D.serverTimestamp()
            });
            await openBetaThread(p.id);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      threadEl.querySelectorAll('[data-beta-del-rep]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          if (!window.confirm('Delete this reply?')) return;
          var repId = btn.getAttribute('data-beta-del-rep');
          try {
            await D.updateDoc(D.doc(db, 'betaPosts', p.id, 'replies', repId), {
              authorUid: 'deleted',
              authorName: 'deleted user',
              body: '[deleted]',
              deleted: true,
              updatedAt: D.serverTimestamp()
            });
            await openBetaThread(p.id);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      threadEl.querySelectorAll('[data-beta-hide-rep]').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var repId = btn.getAttribute('data-beta-hide-rep');
          var isHid = btn.getAttribute('data-hidden') === 'true';
          try {
            await D.updateDoc(D.doc(db, 'betaPosts', p.id, 'replies', repId), {
              hidden: !isHid,
              updatedAt: D.serverTimestamp()
            });
            await openBetaThread(p.id);
          } catch (err) {
            setStatusBox(msgBox, friendlyError(err), true);
          }
        });
      });

      var repForm = document.getElementById('beta-reply-form');
      if (repForm) repForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearFormMsg(repForm);
        var bodyEl = getField(repForm, ['body', 'reply']) || repForm.querySelector('textarea');
        var cleaned = redact(clip(bodyEl && bodyEl.value, 2000));
        if (cleaned.text.length < 2) {
          showFormMsg(repForm, 'Please write a short reply.', true);
          return;
        }
        try {
          var repRef = D.doc(D.collection(db, 'betaPosts', p.id, 'replies'));
          var batch = D.writeBatch(db);
          batch.set(repRef, {
            authorUid: state.user.uid,
            authorName: safeAuthorName(state.displayName),
            isTeam: state.isStaff,
            body: cleaned.text,
            hidden: false,
            deleted: false,
            createdAt: D.serverTimestamp(),
            updatedAt: D.serverTimestamp()
          });
          batch.update(D.doc(db, 'betaPosts', p.id), {
            replyCount: D.increment(1),
            lastReplyAt: D.serverTimestamp(),
            updatedAt: D.serverTimestamp()
          });
          await batch.commit();
          await loadPosts();
          await openBetaThread(p.id);
        } catch (err) {
          showFormMsg(repForm, friendlyError(err), true);
        }
      });
    }

    if (newPostForm) newPostForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      setStatusBox(newStatus, '', false);
      if (!state.user || !state.isBeta) return;
      var hp = getField(newPostForm, ['website', 'hp']);
      if (hp && hp.value) { newPostForm.reset(); return; }

      var titleEl = getField(newPostForm, ['title']);
      var bodyEl = getField(newPostForm, ['body', 'what', 'message']) || newPostForm.querySelector('textarea');
      var verEl = getField(newPostForm, ['version']);
      var pcEl = getField(newPostForm, ['pc']);

      var t = redact(clip(titleEl && titleEl.value, 160));
      var b = redact(clip(bodyEl && bodyEl.value, 4000));
      var ver = redactLight(clip(verEl && verEl.value, 60));
      var pc = redact(clip(pcEl && pcEl.value, 160));

      if (t.text.length < 3 || b.text.length < 2) {
        setStatusBox(newStatus, 'Please enter a title and message.', true);
        return;
      }
      try {
        var docRef = await D.addDoc(D.collection(db, 'betaPosts'), {
          authorUid: state.user.uid,
          authorName: safeAuthorName(state.displayName),
          isTeam: state.isStaff,
          title: t.text,
          body: b.text,
          version: ver.text,
          pc: pc.text,
          replyCount: 0,
          hidden: false,
          deleted: false,
          createdAt: D.serverTimestamp(),
          updatedAt: D.serverTimestamp()
        });
        newPostForm.reset();
        setStatusBox(newStatus, 'Posted to the beta board.', false);
        await loadPosts();
        await openBetaThread(docRef.id);
      } catch (err) {
        setStatusBox(newStatus, friendlyError(err), true);
      }
    });

    F.onAuthStateChanged(auth, async function (user) {
      state = await resolveUserState(ctx, user);
      if (!state.user) {
        if (gateSignedOut) gateSignedOut.hidden = false;
        if (gateNotTester) gateNotTester.hidden = true;
        if (panelEl) panelEl.hidden = true;
        return;
      }
      if (!state.isBeta && !state.isStaff) {
        if (gateSignedOut) gateSignedOut.hidden = true;
        if (gateNotTester) gateNotTester.hidden = false;
        if (panelEl) panelEl.hidden = true;
        return;
      }
      if (gateSignedOut) gateSignedOut.hidden = true;
      if (gateNotTester) gateNotTester.hidden = true;
      if (panelEl) panelEl.hidden = false;
      await loadPosts();
    });
  }

  /* ---------- bootstrap Firebase only on interactive pages ---------- */
  loadFirebase().then(async function (ctx) {
    var emailLinkStatus = await completeEmailLinkIfPresent(ctx);
    if (emailLinkStatus && emailLinkStatus.msg && !accountEl) {
      showOfflineBanner(emailLinkStatus.msg);
    }
    initCommunityReports(ctx);
    initAccountPage(ctx, emailLinkStatus);
    initBetaBoard(ctx);
  }).catch(function (err) {
    showOfflineBanner(friendlyError(err));
  });
})();
