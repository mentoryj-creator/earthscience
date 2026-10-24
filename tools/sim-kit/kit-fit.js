/* ===== sim-kit 화면 맞춤 · 전체화면 (tools/sim-kit/kit-fit.js에서 자동으로 넣음 — 이 블록은 직접 고치지 마세요) =====
   - 사이트 안(iframe)에서는 폭에 맞춰 1920×1080 화면을 줄이고, 높이를 사이트에 알려 줌(sim-height)
   - 새 창·전체화면에서는 화면 안에 16:9로 꽉 차게 가운데 정렬
   - 전체화면을 켜면 휴대폰·태블릿은 가로 화면으로 돌림(지원하는 기기만) */
(function () {
  var w = document.getElementById('presentation-wrapper');
  var inFrame = window.top !== window.self, de = document.documentElement;
  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || de.classList.contains('pfs'); }
  function fit() {
    var h = w.offsetHeight, fs = !inFrame || window.innerHeight >= screen.height - 4 || isFs();
    var s = window.innerWidth / 1920, x = 0, y = 0;
    de.classList.toggle('fit', fs);
    if (fs) { s = Math.min(s, window.innerHeight / h); x = (window.innerWidth - 1920 * s) / 2; y = Math.max(0, (window.innerHeight - h * s) / 2); }
    w.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
    document.body.style.height = fs ? '100%' : Math.ceil(h * s) + 'px';
    if (inFrame && !fs) { try { parent.postMessage({ type: 'sim-height', h: Math.ceil(h * s) }, '*'); } catch (e) {} }
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 250); });
  if (window.ResizeObserver) new ResizeObserver(fit).observe(w);
  fit(); setTimeout(fit, 300);

  var btn = document.getElementById('fsBtn');
  function lockLandscape() {
    try { if (screen.orientation && screen.orientation.lock && matchMedia('(pointer: coarse)').matches) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {}
  }
  function unlock() { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {} }
  function sync() { if (btn) btn.textContent = isFs() ? '✕ 전체화면 끄기' : '⛶ 전체화면'; if (!isFs()) unlock(); fit(); setTimeout(fit, 120); }
  if (btn) btn.onclick = function () {
    if (isFs()) {
      if (de.classList.contains('pfs')) de.classList.remove('pfs');
      else { var ex = document.exitFullscreen || document.webkitExitFullscreen; try { var p = ex && ex.call(document); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      sync(); return;
    }
    var req = de.requestFullscreen || de.webkitRequestFullscreen;
    var fallback = function () { de.classList.add('pfs'); sync(); };
    try { if (!req) throw 0; var p = req.call(de); if (p && p.then) p.then(function () { lockLandscape(); sync(); }, fallback); else { lockLandscape(); sync(); } } catch (e) { fallback(); }
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && de.classList.contains('pfs')) { de.classList.remove('pfs'); sync(); } });
})();
