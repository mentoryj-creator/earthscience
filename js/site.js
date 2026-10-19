// =====================================================================
//  공통 스크립트: 메뉴, 카드, 도우미 함수
//  모든 페이지가 data/sims.js 다음에 이 파일을 불러옵니다.
// =====================================================================
(function () {
  const S = window.SITE;
  // 이 파일 위치로 사이트 최상위 주소를 계산 (어느 폴더의 페이지에서 불러도 동작)
  const ROOT = document.currentScript.src.replace(/js\/site\.js(\?.*)?$/, '');

  // ---- 디자인 테마 ----
  // 사이트 기본값은 sims.js의 "theme" (관리 페이지에서 고름).
  // 주소 뒤에 ?theme=observatory 처럼 붙이면 이 창에서만 미리 볼 수 있습니다. (?theme=reset 으로 원래대로)
  const THEMES = { basic: '기본', nightsky: '밤하늘 관측소', observatory: '관측소', contour: '지형도', strata: '지구 단면' };
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} } };
  const qTheme = new URLSearchParams(location.search).get('theme');
  if (qTheme === 'reset') ss.set('previewTheme', null);
  else if (qTheme && THEMES[qTheme]) ss.set('previewTheme', qTheme);
  const theme = ss.get('previewTheme') || (THEMES[S.theme] ? S.theme : 'basic');
  if (theme !== 'basic') {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = ROOT + 'css/themes/' + theme + '.css';
    document.head.appendChild(link);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // **굵게** 만 지원하는 아주 간단한 서식
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);

  const course = id => S.courses.find(c => c.id === id);
  const topic = id => S.topics.find(t => t.id === id);
  const unit = (cid, uid) => (course(cid)?.units || []).find(u => u.id === uid);
  const param = k => new URLSearchParams(location.search).get(k);

  const url = {
    home: () => ROOT + 'index.html',
    course: (cid, uid) => ROOT + 'course.html?c=' + cid + (uid ? '#' + uid : ''),
    topic: tid => ROOT + 'topic.html?t=' + tid,
    sim: id => ROOT + 'sim.html?id=' + encodeURIComponent(id),
    file: f => ROOT + f,
  };

  // 시뮬레이션 카드 HTML
  function card(sim, opts = {}) {
    const t = topic(sim.topic) || {};
    const chips = opts.noChips ? '' : '<div class="chips">' + (sim.links || [])
      .map(l => course(l.course)).filter(Boolean)
      .map(c => `<span class="chip">${esc(c.name)}</span>`).join('') + '</div>';
    const inner = `<span class="tag">${[t.name, sim.sub].filter(Boolean).map(esc).join(' · ')}</span>
      <h3>${esc(sim.title)}</h3><p>${esc(sim.desc)}</p>${chips}`;
    const style = `style="--c:${t.color || 'var(--accent)'}"`;
    return sim.status === 'ready'
      ? `<a class="card" ${style} href="${url.sim(sim.id)}">${inner}</a>`
      : `<div class="card soon" ${style}>${inner}</div>`;
  }

  // 머리말(메뉴) 그리기
  function header() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const levelMenus = S.levels.map(lv => {
      const cs = S.courses.filter(c => c.level === lv.id);
      if (lv.soon || !cs.length)
        return `<div class="nav-item"><span class="nav-link disabled">${esc(lv.name)} <small>준비 중</small></span></div>`;
      return `<div class="nav-item">
        <button class="nav-link">${esc(lv.name)} <span class="caret">▼</span></button>
        <div class="dropdown">${cs.map(c => {
          const n = S.sims.filter(s => s.status === 'ready' && (s.links || []).some(l => l.course === c.id)).length;
          return `<a href="${url.course(c.id)}">${esc(c.name)}<small>${n}</small></a>`;
        }).join('')}</div></div>`;
    }).join('');
    const topicMenu = `<div class="nav-item">
      <button class="nav-link">주제별 <span class="caret">▼</span></button>
      <div class="dropdown">${S.topics.map(t =>
        `<a href="${url.topic(t.id)}">${esc(t.name)}</a>`).join('')}</div></div>`;

    el.className = 'site-header';
    el.innerHTML = `<div class="inner">
      <a class="logo" href="${url.home()}">지구과학 <span>시뮬레이션</span> 실험실</a>
      <button class="menu-btn" aria-label="메뉴">☰</button>
      <nav class="nav">${levelMenus}${topicMenu}</nav></div>`;
    const nav = el.querySelector('.nav');
    el.querySelector('.menu-btn').onclick = () => nav.classList.toggle('open');
  }

  function footer() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.className = 'site-footer';
    el.innerHTML = `지구과학 시뮬레이션 실험실 · 그림의 크기와 거리는 실제 비율과 다를 수 있습니다
      · Made by Kwon Youngjae · <a href="${ROOT}admin.html">관리</a>`;
  }


  /* ---- 목차 따라가기: 화면을 내리다 다른 단원(소주제)으로 넘어가면 왼쪽 목차 글씨가 반짝 ---- */
  function tocSpy() {
    const links = [...document.querySelectorAll('.toc a[href^="#"]')];
    const secs = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    if (!secs.length) return;
    let cur = null;
    function update(first) {
      const y = 140;
      let i = 0;
      secs.forEach((s, k) => { if (s.getBoundingClientRect().top <= y) i = k; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) i = secs.length - 1;
      if (i === cur) return;
      cur = i;
      links.forEach((a, k) => {
        a.classList.toggle('on', k === i);
        a.classList.remove('flash');
        if (k === i && !first) { void a.offsetWidth; a.classList.add('flash'); }
      });
    }
    window.addEventListener('scroll', () => update(false), { passive: true });
    window.addEventListener('resize', () => update(false));
    update(true);
  }

  window.App = { S, ROOT, THEMES, theme, esc, fmt, lines, course, topic, unit, param, url, card };
  document.addEventListener('DOMContentLoaded', () => { header(); footer(); tocSpy(); });
})();
