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
  // THEME_INFO: 관리 페이지의 디자인 고르기 칸에 보이는 이름·설명·색 견본
  const THEME_INFO = {
    bento:     { name: '시안 01 · 벤토 그리드',      desc: '밝은 타일형, 깔끔한 정보 전달',   sw: ['#F2F2EE', '#FFFFFF', '#1E46E0', '#FF6A2B'] },
    editorial: { name: '시안 02 · 에디토리얼 매거진', desc: '명조 제목, 잡지 같은 지면',      sw: ['#F3EEE3', '#1B1813', '#B2301C', '#CDBFA5'] },
    brutal:    { name: '시안 03 · 네오 브루탈리즘',  desc: '굵은 테두리와 원색, 눈에 확',    sw: ['#FFF3D1', '#000000', '#FFCE3A', '#2B3BD9'] },
    aurora:    { name: '시안 04 · 오로라 글래스',    desc: '어두운 배경에 유리 패널',        sw: ['#06070D', '#2DD4BF', '#8B5CF6', '#FFFFFF'] },
    swiss:     { name: '시안 05 · 스위스 그리드',    desc: '흑백과 빨강, 큰 숫자',          sw: ['#FFFFFF', '#000000', '#D40511', '#EDEDED'] },
    notebook:  { name: '시안 06 · 실험 노트',        desc: '모눈종이와 손글씨 메모',        sw: ['#FBFAF4', '#1D2B4F', '#FFE45C', '#C8233A'] },
    console:   { name: '시안 07 · 미션 콘솔',        desc: '터미널 관제실, 정보량 많음',     sw: ['#0A0E0C', '#4CFF9A', '#FFB84A', '#1E2A24'] },
    megatype:  { name: '시안 08 · 메가 타이포',      desc: '초대형 글자, 과감한 대비',       sw: ['#0B0B0B', '#F2F2F2', '#D6FF3D', '#1A1A1A'] },
    clay:      { name: '시안 09 · 소프트 클레이',    desc: '파스텔 입체 카드, 친근함',       sw: ['#EEF0FB', '#FFFFFF', '#3B3FB6', '#BFF0DC'] },
    retro:     { name: '시안 10 · 레트로 OS',        desc: '옛날 윈도 창 콘셉트',           sw: ['#2F7F7A', '#D4D0C8', '#0A246A', '#FFFFFF'] },
    basic:       { name: '기본',          desc: '이전 디자인', old: true, sw: ['#F6F7F9', '#FFFFFF', '#2563EB', '#1D2330'] },
    nightsky:    { name: '밤하늘 관측소', desc: '이전 디자인', old: true, sw: ['#070B1A', '#0E1530', '#FFCF6B', '#E6EBF7'] },
    observatory: { name: '관측소',        desc: '이전 디자인', old: true, sw: ['#0E1530', '#151D3D', '#F2C94C', '#E6E9F5'] },
    contour:     { name: '지형도',        desc: '이전 디자인', old: true, sw: ['#EEF1E8', '#FBFCF8', '#2F6F94', '#22302A'] },
    strata:      { name: '지구 단면',     desc: '이전 디자인', old: true, sw: ['#F6F8FC', '#FFFFFF', '#1F4FD1', '#14213D'] },
  };
  const THEMES = Object.fromEntries(Object.entries(THEME_INFO).map(([k, v]) => [k, v.name]));
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} } };
  const qTheme = new URLSearchParams(location.search).get('theme');
  if (qTheme === 'reset') ss.set('previewTheme', null);
  else if (qTheme && THEMES[qTheme]) ss.set('previewTheme', qTheme);
  const theme = ss.get('previewTheme') || (THEMES[S.theme] ? S.theme : 'basic');
  document.documentElement.dataset.theme = theme;
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

  // ---- 방문 통계 (GoatCounter, 쿠키 없음) ----
  // 페이지마다 알아보기 쉬운 주소로 기록: /, /course/pss, /topic/astro, /sim/<id>
  // 관리 페이지와 내 컴퓨터(localhost)에서 열 때는 기록하지 않음
  const GC = 'https://earthscience-lab.goatcounter.com';
  const page = location.pathname.split('/').pop() || 'index.html';
  const gcPath = page === 'sim.html' ? '/sim/' + (new URLSearchParams(location.search).get('id') || '')
    : page === 'course.html' ? '/course/' + (new URLSearchParams(location.search).get('c') || '')
    : page === 'topic.html' ? '/topic/' + (new URLSearchParams(location.search).get('t') || '')
    : page === 'index.html' ? '/' : '/' + page;
  if (page !== 'admin.html' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.protocol !== 'file:') {
    window.goatcounter = { path: gcPath };
    const gs = document.createElement('script');
    gs.async = true; gs.src = 'https://gc.zgo.at/count.js'; gs.dataset.goatcounter = GC + '/count';
    document.head.appendChild(gs);
  }

  const url = {
    home: () => ROOT + 'index.html',
    course: (cid, uid) => ROOT + 'course.html?c=' + cid + (uid ? '#' + uid : ''),
    topic: tid => ROOT + 'topic.html?t=' + tid,
    sim: id => ROOT + 'sim.html?id=' + encodeURIComponent(id),
    file: f => ROOT + f,
  };

  // ---- 날짜 ----
  // sims.js의 added(추가한 날)·updated(고친 날)는 'YYYY-MM-DD'. 관리 페이지가 자동으로 적습니다.
  const NEW_DAYS = 14;
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const daysAgo = d => d ? (Date.now() - new Date(d + 'T00:00:00').getTime()) / 864e5 : Infinity;
  // 최근 추가 순 (같은 날이면 목록에서 뒤에 있는 것이 더 최근)
  const byNewest = list => list.map((s, i) => [s, i]).sort((a, b) =>
    String(b[0].added || '').localeCompare(String(a[0].added || '')) || b[1] - a[1]).map(x => x[0]);
  // NEW 표시: 최근 2주 안에 추가된 것 중 가장 최근 12개까지만 (한꺼번에 많이 올리면 전부 NEW가 되지 않도록)
  const NEW_MAX = 12;
  const newIds = new Set(byNewest(S.sims.filter(s => s.status === 'ready')).slice(0, NEW_MAX)
    .filter(s => daysAgo(s.added) < NEW_DAYS).map(s => s.id));
  const isNew = sim => newIds.has(sim.id);

  // ---- 시뮬레이션 HTML 내려받기 ----
  // 파일 안의 상대 주소(../../course.html 등)는 사이트 전체 주소로 바꿔 두어,
  // 내려받은 파일에서도 링크가 사이트로 이어집니다.
  const fileName = sim => String(sim.title || sim.id).replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.html';
  async function getHtml(sim) {
    const src = url.file(sim.file);
    const res = await fetch(src);
    if (!res.ok) throw new Error(sim.file + ' (' + res.status + ')');
    const abs = new URL(src, location.href);
    return (await res.text()).replace(/\b(href|src)="(\.\.?\/[^"]*)"/g, (m, attr, p) => `${attr}="${new URL(p, abs).href}"`);
  }
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function track(path, title) {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true });
  }
  async function download(sim) {
    try {
      saveBlob(new Blob([await getHtml(sim)], { type: 'text/html;charset=utf-8' }), fileName(sim));
    } catch (e) {
      // 내 컴퓨터(file://)에서 열었을 때처럼 fetch가 막히면 원본 파일을 그대로 저장
      const a = document.createElement('a');
      a.href = url.file(sim.file); a.download = fileName(sim);
      document.body.appendChild(a); a.click(); a.remove();
    }
    track('download/' + sim.id, sim.title);
  }

  // ---- 여러 시뮬레이션을 ZIP 하나로 (압축 없이 묶기만 함, 외부 라이브러리 없음) ----
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function makeZip(files) {               // files: [{ name, data: Uint8Array }]
    const enc = new TextEncoder(), parts = [], central = [];
    const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)),
          dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate());
    let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);   // UTF-8 파일 이름
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true);
      h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true);
      c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + n;
    }
    const size = central.reduce((a, x) => a + x.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  // sims 목록을 ZIP으로. 압축 파일 안에 '00 목록.html'(설명 + 바로가기)을 함께 넣습니다.
  async function downloadZip(sims, zipName, heading, onProgress) {
    const enc = new TextEncoder(), files = [], used = new Set(), fails = [];
    const list = sims.filter(s => s.status === 'ready' && s.file);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      onProgress && onProgress(i + 1, list.length);
      let name = fileName(s);
      for (let k = 2; used.has(name); k++) name = fileName(s).replace(/\.html$/, ` (${k}).html`);
      try { files.push({ name, data: enc.encode(await getHtml(s)) }); used.add(name); s._zipName = name; }
      catch (e) { fails.push(s.title); }
    }
    const ok = list.filter(s => s._zipName);
    const index = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(heading)}</title>
<style>body{font-family:system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;max-width:860px;margin:40px auto;padding:0 20px;line-height:1.7;color:#1d2330;word-break:keep-all}
h1{font-size:1.6rem}li{margin:14px 0}a{font-weight:700;font-size:1.08rem}p{margin:2px 0;color:#4a5160}small{color:#6b7280}</style></head><body>
<h1>${esc(heading)}</h1><p>시뮬레이션 ${ok.length}개 · 제목을 누르면 열립니다(인터넷 없이도 실행). 내려받은 날 ${today()}</p><ol>
${ok.map(s => `<li><a href="${encodeURIComponent(s._zipName)}">${esc(s.title)}</a><p>${esc(s.desc || '')}</p></li>`).join('\n')}
</ol><p><small>지구과학 시뮬레이션 실험실 · <a href="${esc(location.origin + location.pathname.replace(/[^/]*$/, ''))}">${esc(location.host)}</a></small></p></body></html>`;
    ok.forEach(s => delete s._zipName);
    files.unshift({ name: '00 목록.html', data: enc.encode(index) });
    saveBlob(makeZip(files), zipName.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.zip');
    track('download-zip/' + zipName, heading);
    return { count: ok.length, fails };
  }
  // [단원 전체 받기] 버튼: data-zip="제목", data-ids="id1,id2" 를 단 버튼을 누르면 실행
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-zip]');
    if (!b || b.disabled) return;
    const ids = b.dataset.ids.split(',');
    const sims = S.sims.filter(s => ids.includes(s.id));
    const label = b.querySelector('span') || b, before = label.textContent;
    b.disabled = true;
    try {
      const r = await downloadZip(sims, b.dataset.zip, b.dataset.zip, (i, n) => label.textContent = `준비 중 ${i}/${n}`);
      if (r.fails.length) alert('다음 시뮬레이션은 받지 못했습니다:\n' + r.fails.join('\n'));
    } catch (err) { alert('ZIP을 만들지 못했습니다: ' + err.message); }
    label.textContent = before; b.disabled = false;
  });

  // ---- QR 코드 (js/vendor/qrcode.js, MIT · 필요할 때만 불러옴) ----
  let qrLib = null;
  function loadQr() {
    return qrLib || (qrLib = new Promise((ok, no) => {
      const sc = document.createElement('script'); sc.src = ROOT + 'js/vendor/qrcode.js';
      sc.onload = () => ok(window.qrcode); sc.onerror = () => no(new Error('QR 코드를 만들지 못했습니다'));
      document.head.appendChild(sc);
    }));
  }
  async function showQr(link, title) {
    const qrcode = await loadQr();
    const q = qrcode(0, 'M'); q.addData(link); q.make();
    let dlg = document.getElementById('qrDlg');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'qrDlg'; dlg.className = 'qr-dlg';
      dlg.addEventListener('click', ev => { if (ev.target === dlg || ev.target.closest('[data-close]')) dlg.close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = `<div class="qr-box"><h2>${esc(title)}</h2>
      <div class="qr-img" role="img" aria-label="${esc(title)} 주소 QR 코드">${q.createSvgTag({ cellSize: 8, margin: 2, scalable: true })}</div>
      <p class="qr-url">${esc(link.replace(/^https?:\/\//, ''))}</p>
      <p class="qr-help">휴대폰 카메라로 비추면 이 시뮬레이션이 열립니다.</p>
      <div class="qr-btns"><button type="button" class="btn ghost" id="qrCopy">주소 복사</button><button type="button" class="btn" data-close>닫기</button></div></div>`;
    dlg.querySelector('#qrCopy').onclick = ev => navigator.clipboard?.writeText(link).then(() => ev.target.textContent = '복사됨 ✓');
    dlg.showModal();
    track('qr/' + (param('id') || ''), title);
  }

  // ---- 오류 신고 주소 ----
  // 관리 페이지에서 정한 주소(구글 폼 등)를 쓰고, 비어 있으면 GitHub 이슈 쓰기 화면으로.
  // 주소 안의 {title} {id} {url} 은 시뮬레이션 정보로 바뀝니다.
  const REPO = 'https://github.com/mentoryj-creator/earthscience';
  function feedbackUrl(sim) {
    const link = sim ? new URL(url.sim(sim.id), location.href).href : location.href;
    const fill = s => s.replace(/\{title\}/g, encodeURIComponent(sim ? sim.title : document.title))
      .replace(/\{id\}/g, encodeURIComponent(sim ? sim.id : '')).replace(/\{url\}/g, encodeURIComponent(link));
    if (S.feedback) return fill(S.feedback);
    const body = `**시뮬레이션**: ${sim ? sim.title + ' (' + sim.id + ')' : '-'}\n**주소**: ${link}\n**기기·브라우저**: ${navigator.userAgent}\n\n**어떤 문제가 있었나요?**\n\n\n**어떻게 하면 다시 볼 수 있나요? (선택)**\n`;
    return `${REPO}/issues/new?title=${encodeURIComponent('[오류] ' + (sim ? sim.title : ''))}&body=${encodeURIComponent(body)}`;
  }

  // 시뮬레이션 카드 HTML
  const THUMBS = window.THUMBS || {};
  function card(sim, opts = {}) {
    const t = topic(sim.topic) || {};
    const chips = opts.noChips ? '' : '<div class="chips">' + (sim.links || [])
      .map(l => course(l.course)).filter(Boolean)
      .map(c => `<span class="chip">${esc(c.name)}</span>`).join('') + '</div>';
    const fresh = sim.status === 'ready' && isNew(sim) ? '<span class="new-badge">NEW</span>' : '';
    const tag = `<span class="tag">${fresh}${[t.name, sim.sub].filter(Boolean).map(esc).join(' · ')}</span>`;
    const thumb = THUMBS[sim.id] && sim.status === 'ready'
      ? `<img class="thumb" src="${ROOT}thumbs/${encodeURIComponent(sim.id)}.jpg?v=${THUMBS[sim.id]}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : '';
    const style = `style="--c:${t.color || 'var(--accent)'}"`;
    if (sim.status !== 'ready')
      return `<div class="card sim-card soon" ${style}>${tag}<h3>${esc(sim.title)}</h3><p>${esc(sim.desc)}</p>${chips}</div>`;
    // 카드 전체가 눌리도록 제목 링크를 카드 크기로 펼치고(.card-link::after), 내려받기 버튼만 그 위에 둡니다.
    return `<article class="card sim-card ready${thumb ? ' has-thumb' : ''}" ${style}>${thumb}${tag}
      <h3><a class="card-link" href="${url.sim(sim.id)}" data-goatcounter-click="/click/${esc(sim.id)}" data-goatcounter-title="${esc(sim.title)}">${esc(sim.title)}</a></h3>
      <p>${esc(sim.desc)}</p>${chips}
      <button type="button" class="card-dl" data-dl="${esc(sim.id)}" aria-label="${esc(sim.title)} HTML 파일 내려받기"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/></svg><span>HTML 받기</span></button>
    </article>`;
  }
  // [단원 전체 받기] 버튼 HTML
  function zipButton(sims, name) {
    const ready = sims.filter(s => s.status === 'ready' && s.file);
    if (ready.length < 2) return '';
    return `<button type="button" class="zip-btn" data-zip="${esc(name)}" data-ids="${esc(ready.map(s => s.id).join(','))}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"/></svg><span>전체 받기 (ZIP · ${ready.length}개)</span></button>`;
  }

  // 카드의 [HTML 받기] 버튼 (어느 페이지에서든)
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-dl]');
    if (!b) return;
    const sim = S.sims.find(s => s.id === b.dataset.dl);
    if (!sim || b.disabled) return;
    const label = b.querySelector('span');
    b.disabled = true; if (label) label.textContent = '저장 중…';
    await download(sim);
    b.disabled = false; if (label) label.textContent = 'HTML 받기';
  });

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
      · Made by Kwon Youngjae · <a class="fb" href="${feedbackUrl(page === 'sim.html' ? S.sims.find(x => x.id === param('id')) : null)}" target="_blank" rel="noopener">의견 · 오류 보내기</a>
      · <a href="${ROOT}admin.html">관리</a>`;
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

  window.App = { S, ROOT, THEMES, THEME_INFO, theme, esc, fmt, lines, course, topic, unit, param, url, card, download, downloadZip, zipButton, showQr, feedbackUrl, today, isNew, byNewest, REPO, GC };
  document.addEventListener('DOMContentLoaded', () => { header(); footer(); tocSpy(); });
})();
