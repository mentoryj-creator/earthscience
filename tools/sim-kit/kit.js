/* ===== sim-kit 공통 도구 (tools/sim-kit/kit.js에서 자동으로 넣음 — 이 블록은 직접 고치지 마세요) =====
   SIM.loop / SIM.pos / SIM.font ...  : 그리기 도우미 (행성우주과학 시뮬레이션과 같음)
   SIM.tabs()                          : ① 예측 ② 실험 ③ 미션 탭
   SIM.predict({...})                  : 예측하고 확인
   SIM.missions({...})                 : 도전 미션 (조건을 자동으로 확인)
   SIM.toast(글, 'info'|'warn')        : 그림 위에 잠깐 뜨는 알림
*/
window.SIM = {
  FONT: "'Gowun Dodum', sans-serif",
  // 해당 슬라이드가 화면에 보일 때만 그리기
  loop(slideId, fn) {
    const el = document.getElementById(slideId);
    let last = performance.now();
    function f(t) {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!el || el.classList.contains('active')) fn(t, dt);
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  },
  rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  gauss(r) { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  pos(ev, c) { const r = c.getBoundingClientRect(); return { x: (ev.clientX - r.left) * c.width / r.width, y: (ev.clientY - r.top) * c.height / r.height }; },
  font(px, bold) { return (bold === false ? '' : 'bold ') + px + 'px ' + this.FONT; },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  fmtExp(v, digits) {
    if (!isFinite(v) || v <= 0) return '0';
    const e = Math.floor(Math.log10(v)); const m = v / Math.pow(10, e);
    const sup = String(e).split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(ch)] || ch).join('');
    return m.toFixed(digits == null ? 1 : digits) + '×10' + sup;
  },

  // ---- 고해상도 캔버스 (W×H 좌표로 그리면 됨) ----
  // const S = SIM.stage({ canvas, W: 1000, H: 620 });  S.begin(); 그리기…  S.pt(이벤트) → {x,y}
  // 1920 화면이 줄었다 늘었다 해도 그림이 흐려지지 않게 내부 해상도를 고정(기본 2배)으로 둠
  stage(o) {
    const cvs = o.canvas, W = o.W, H = o.H, k = o.scale || 2;
    cvs.width = Math.round(W * k); cvs.height = Math.round(H * k);
    cvs.style.aspectRatio = W + '/' + H;
    const ctx = cvs.getContext('2d');
    return {
      ctx, W, H,
      begin() { ctx.setTransform(k, 0, 0, k, 0, 0); },
      pt(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; },
      resize() {},
    };
  },

  // ---- 알림 ----
  toast(text, kind, ms) {
    const stage = document.querySelector('.slide.active .sim-stage') || document.getElementById('presentation-wrapper');
    let t = stage.querySelector(':scope > .sim-toast');
    if (!t) { t = document.createElement('div'); t.className = 'sim-toast'; stage.appendChild(t); }
    t.textContent = text; t.className = 'sim-toast ' + (kind || '');
    void t.offsetWidth; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 2600);
  },
  burst() {
    const stage = document.querySelector('.slide.active .sim-stage');
    if (!stage) return;
    const cols = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7'];
    for (let i = 0; i < 26; i++) {
      const b = document.createElement('i'); b.className = 'sim-burst';
      b.style.left = '50%'; b.style.top = '60px'; b.style.background = cols[i % cols.length];
      const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 220;
      b.style.setProperty('--dx', Math.cos(a) * r + 'px'); b.style.setProperty('--dy', Math.sin(a) * r * 0.7 + 120 + 'px');
      stage.appendChild(b); setTimeout(() => b.remove(), 1200);
    }
  },

  // ---- ① 예측 ② 실험 ③ 미션 탭 ----
  // 패널 안의 .sim-tabs > .sim-tab[data-tab] 와 .sim-tabpage[data-page] 를 이어 줌
  tabs(root) {
    root = root || document;
    const tabs = [...root.querySelectorAll('.sim-tab')], pages = [...root.querySelectorAll('.sim-tabpage')];
    const show = name => {
      tabs.forEach(t => { t.classList.toggle('on', t.dataset.tab === name); t.setAttribute('aria-selected', t.dataset.tab === name); });
      pages.forEach(p => p.classList.toggle('on', p.dataset.page === name));
    };
    tabs.forEach(t => { t.setAttribute('role', 'tab'); t.onclick = () => { t.classList.remove('nudge'); show(t.dataset.tab); }; });
    const first = tabs.find(t => t.classList.contains('on')) || tabs[0];
    if (first) show(first.dataset.tab);
    SIM.showTab = show;
    return show;
  },

  // ---- 예측하고 확인 ----
  // SIM.predict({ el: 상자, q: '질문', options: ['…','…'], answer: 정답 번호(0부터),
  //   why: '맞았을 때 함께 보여 줄 설명', setup: () => {실험을 그 조건으로 맞춤},
  //   reached: () => true/false (실험이 확인할 상태에 도달했는지; 없으면 [결과 보기] 버튼) })
  predict(o) {
    const el = typeof o.el === 'string' ? document.querySelector(o.el) : o.el;
    let picked = -1, revealed = false;
    el.innerHTML = `<div class="predict-q"><span class="tag">예측</span>${o.q}</div>
      <div class="predict-opts">${o.options.map((t, i) => `<button type="button" class="predict-opt" data-i="${i}"><span class="n">${'ABCDEF'[i]}</span><span>${t}</span></button>`).join('')}</div>
      <div class="predict-go" hidden><div class="sim-note" style="margin-bottom:8px">좋아요! 이제 실험해서 확인해 봐요.</div>
        <div class="sim-btns"><button type="button" class="sim-btn on" data-act="go">② 실험하러 가기 →</button>${o.reached ? '' : '<button type="button" class="sim-btn" data-act="show">결과 보기</button>'}</div></div>
      <div class="predict-result" hidden></div>`;
    const opts = [...el.querySelectorAll('.predict-opt')];
    const reveal = () => {
      if (revealed || picked < 0) return; revealed = true;
      opts.forEach((b, i) => { b.disabled = true; b.classList.toggle('right', i === o.answer); b.classList.toggle('wrong', i === picked && i !== o.answer); });
      const ok = picked === o.answer, r = el.querySelector('.predict-result');
      r.hidden = false; r.classList.toggle('miss', !ok);
      r.innerHTML = (ok ? '<b>예측 성공!</b> ' : `<b>정답은 ${'ABCDEF'[o.answer]}</b> — `) + (o.why || '');
      el.querySelector('.predict-go').hidden = true;
      SIM.toast(ok ? '예측 성공!' : '예측과 결과가 달라요. 까닭을 확인해 봐요', ok ? '' : 'warn');
      if (ok) SIM.burst();
      const tab = document.querySelector('.sim-tab[data-tab="predict"]');
      if (tab) { tab.classList.add('nudge'); const b = tab.querySelector('.badge') || tab.appendChild(document.createElement('span')); b.className = 'badge ' + (ok ? 'done' : ''); b.textContent = ok ? '✓' : '!'; }
      o.onReveal && o.onReveal(ok);
    };
    opts.forEach((b, i) => b.onclick = () => {
      if (revealed) return;
      picked = i; opts.forEach(x => x.classList.toggle('picked', x === b));
      el.querySelector('.predict-go').hidden = false;
    });
    el.querySelector('[data-act="go"]').onclick = () => { o.setup && o.setup(); SIM.showTab && SIM.showTab('lab'); };
    const sb = el.querySelector('[data-act="show"]'); if (sb) sb.onclick = reveal;
    // 고른 뒤, 실험 상태가 '확인할 상태'에서 한 번 벗어났다가 다시 들어오면 결과를 보여 줌
    // (처음부터 그 상태였다면 학생이 직접 조작해 만들 때까지 기다림)
    let armed = false;
    if (o.reached) SIM._checks.push(() => {
      if (picked < 0 || revealed) return;
      const r = o.reached();
      if (!r) armed = true; else if (armed) reveal();
    });
    return { reveal, get picked() { return picked; } };
  },

  // ---- 도전 미션 ----
  // SIM.missions({ el: 상자, items: [{ t: '할 일', hint: '도움말(선택)', test: () => true/false }] })
  // test는 0.25초마다 자동으로 확인. 한 번 달성하면 계속 달성으로 남음.
  // 처음부터 맞아 있던 조건은 세지 않음 (조건이 거짓이 된 적이 있어야 함).
  missions(o) {
    const el = typeof o.el === 'string' ? document.querySelector(o.el) : o.el;
    const done = o.items.map(() => false);
    el.innerHTML = `<div class="mission-bar"><i></i></div>
      <ul class="mission-list">${o.items.map(m => `<li><span class="ck">✓</span><span>${m.t}${m.hint ? `<span class="hint">${m.hint}</span>` : ''}</span></li>`).join('')}</ul>
      <div class="mission-all" hidden>모든 미션 달성!</div>`;
    const lis = [...el.querySelectorAll('li')], tab = document.querySelector('.sim-tab[data-tab="mission"]');
    const badge = () => {
      const n = done.filter(Boolean).length;
      el.querySelector('.mission-bar i').style.width = (n / done.length * 100) + '%';
      el.querySelector('.mission-all').hidden = n < done.length;
      if (tab) { const b = tab.querySelector('.badge') || tab.appendChild(document.createElement('span')); b.className = 'badge' + (n === done.length ? ' done' : ''); b.textContent = n + '/' + done.length; }
    };
    const mark = i => {
      if (done[i]) return; done[i] = true; lis[i].classList.add('done');
      badge(); SIM.burst();
      const txt = lis[i].querySelector('span:not(.ck)').cloneNode(true); txt.querySelectorAll('.hint').forEach(h => h.remove());
      const t = txt.textContent.trim();
      SIM.toast(done.every(Boolean) ? '모든 미션 달성!' : '미션 달성! ' + (t.length > 24 ? t.slice(0, 23) + '…' : t));
      if (tab && !tab.classList.contains('on')) tab.classList.add('nudge');
    };
    // 처음 열었을 때 이미 조건이 맞아 있으면 달성으로 치지 않음: 한 번 조건에서 벗어났다가 학생이 다시 맞춰야 달성
    const armed = o.items.map(() => false);
    SIM._checks.push(() => o.items.forEach((m, i) => {
      if (done[i]) return;
      let ok = false; try { ok = !!m.test(); } catch (e) {}
      if (!ok) armed[i] = true; else if (armed[i]) mark(i);
    }));
    badge();
    return { mark, done };
  },
  _checks: [],
};
setInterval(() => SIM._checks.forEach(f => f()), 250);
// 슬라이더·입력칸 조작 중에는 키 입력이 다른 곳으로 새지 않게
document.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
document.addEventListener('pointerup', () => { const a = document.activeElement; if (a && a.tagName === 'INPUT' && a.type === 'range') a.blur(); });
