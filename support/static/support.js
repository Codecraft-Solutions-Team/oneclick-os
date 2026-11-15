(function () {
  var root = document.documentElement;
  function dark() { return root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches; }
  function logo() { var w = document.querySelector('[data-wordmark]'); if (w) w.src = '/static/wordmark-' + (dark() ? 'dark' : 'light') + '.svg'; }
  logo();
  var b = document.getElementById('theme');
  if (b) b.onclick = function () {
    root.dataset.theme = dark() ? 'light' : 'dark';
    try { localStorage.setItem('oneclick-theme', root.dataset.theme); } catch (e) {}
    logo();
  };

  var out = document.getElementById('results');
  if (!out) return;
  var q = document.getElementById('q');
  var start = new URLSearchParams(location.search).get('q') || '';
  q.value = start;
  var data = null;
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    var words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) { out.innerHTML = ''; return; }
    var hits = data.map(function (a) {
      var t = a.t.toLowerCase(), s = a.s.toLowerCase(), x = a.x.toLowerCase(), score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], k = 0;
        if (t.indexOf(w) >= 0) k += 10;
        if (s.indexOf(w) >= 0) k += 4;
        if (x.indexOf(w) >= 0) k += 1;
        if (!k) return null;
        score += k;
      }
      return { a: a, score: score };
    }).filter(Boolean).sort(function (m, n) { return n.score - m.score; }).slice(0, 30);
    out.innerHTML = hits.length ? hits.map(function (h) {
      return '<a class="row" href="' + h.a.u + '"><small>' + esc(h.a.c) + '</small><b>' + esc(h.a.t) + '</b><span>' + esc(h.a.s) + '</span></a>';
    }).join('') : '';
    var e = document.getElementById('empty');
    if (!e) { e = document.createElement('p'); e.id = 'empty'; e.className = 'empty'; out.after(e); }
    e.innerHTML = hits.length ? '' : 'Nothing matched. Try fewer words, or <a href="https://oneclickos.org/report">tell us what you were looking for</a>.';
  }
  fetch('/static/index.json?v=' + Date.now().toString().slice(0, 7)).then(function (r) { return r.json(); }).then(function (d) { data = d; run(); });
  q.addEventListener('input', function () {
    if (data) run();
    history.replaceState(null, '', q.value ? '?q=' + encodeURIComponent(q.value) : location.pathname);
  });
  q.focus();
})();
