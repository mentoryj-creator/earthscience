#!/usr/bin/env python3
"""사이트 자동 점검 + 썸네일 만들기

GitHub Actions(.github/workflows/check.yml)가 저장소에 무언가 올라올 때마다 실행합니다.
내 컴퓨터에서 직접 돌려 볼 수도 있습니다:
    pip install playwright && python -m playwright install chromium
    python tools/check_site.py            # 점검만
    python tools/check_site.py --thumbs   # 점검 + 바뀐 시뮬레이션의 썸네일 다시 찍기

하는 일
  1. data/sims.js 목록 점검: 파일이 실제로 있는지, id가 겹치지 않는지, 과목·단원·주제가 맞는지
  2. 시뮬레이션 파일 점검: 브라우저로 열어 스크립트 오류·깨진 파일 연결이 없는지
  3. (--thumbs) 시뮬레이션 첫 화면을 찍어 thumbs/<id>.jpg 로 저장, data/thumbs.js 목록 갱신
  4. 결과를 data/health.json 에 남김 (관리 페이지 → 통계 탭에서 보임)
오류가 하나라도 있으면 실패(종료 코드 1)로 끝나고, GitHub가 메일로 알려 줍니다.
"""
import functools
import hashlib
import http.server
import json
import os
import re
import sys
import threading
import time
from datetime import datetime, timezone, timedelta
from urllib.parse import quote, unquote, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
THUMB_W, THUMB_H = 960, 600          # 찍을 때 화면 크기 (저장은 절반 크기)
WAIT_MS = 1800                        # 애니메이션이 시작될 때까지 기다리는 시간

errors, warnings = [], []
def err(sim, msg): errors.append({'id': sim, 'msg': msg})
def warn(sim, msg): warnings.append({'id': sim, 'msg': msg})


def load_site():
    src = open(os.path.join(ROOT, 'data/sims.js'), encoding='utf8').read()
    m = re.search(r'/\*DATA-START\*/([\s\S]*)/\*DATA-END\*/', src)
    if not m:
        sys.exit('data/sims.js 에서 DATA-START ~ DATA-END 표시를 찾지 못했습니다.')
    return json.loads(m.group(1))


def file_hash(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read()).hexdigest()[:10]


# ---------------------------------------------------------------- 1. 목록 점검
def check_list(site):
    courses = {c['id']: {u['id'] for u in c['units']} for c in site['courses']}
    topics = {t['id']: set(t['subs']) for t in site['topics']}
    seen = {}
    for s in site['sims']:
        sid = s.get('id') or '(id 없음)'
        if sid in seen:
            err(sid, f"id가 겹칩니다 ('{seen[sid]}'와 '{s.get('title')}')")
        seen[sid] = s.get('title')
        f = s.get('file')
        if s.get('status') == 'ready':
            if not f:
                err(sid, '공개 상태인데 파일 경로가 비어 있습니다')
            elif not os.path.isfile(os.path.join(ROOT, f)):
                err(sid, f'파일이 없습니다: {f}')
        for l in s.get('links') or []:
            if l['course'] not in courses:
                err(sid, f"없는 과목에 연결되어 있습니다: {l['course']}")
            elif l['unit'] not in courses[l['course']]:
                err(sid, f"없는 단원에 연결되어 있습니다: {l['course']} / {l['unit']}")
        if not s.get('links'):
            warn(sid, '어느 과목·단원에도 연결되어 있지 않습니다')
        if s.get('topic') in topics and s.get('sub') and s['sub'] not in topics[s['topic']]:
            warn(sid, f"소주제 '{s['sub']}'가 주제 목록에 없어 '기타'로 묶입니다")
        if not s.get('desc'):
            warn(sid, '카드에 보일 한 줄 설명이 비어 있습니다')
    # 목록에 없는 시뮬레이션 파일
    listed = {s.get('file') for s in site['sims']}
    for dirpath, _, files in os.walk(os.path.join(ROOT, 'sims')):
        for n in files:
            if n.lower().endswith(('.html', '.htm')):
                rel = os.path.relpath(os.path.join(dirpath, n), ROOT).replace(os.sep, '/')
                if rel not in listed:
                    warn(None, f'목록(sims.js)에 없는 파일입니다: {rel}')


# ---------------------------------------------------------------- 2·3. 브라우저 점검 + 썸네일
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/'


# 내용이 있는 부분만 16:10으로 잘라 찍기 (화면 가운데 정렬된 시뮬레이션의 빈 여백을 줄임)
CONTENT_JS = """() => {
  let t = Infinity, b = -Infinity, l = Infinity, r = -Infinity;
  for (const el of document.body.querySelectorAll('*')) {
    if (el.children.length > 0 && !['CANVAS', 'SVG', 'svg', 'IMG', 'BUTTON'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
    const q = el.getBoundingClientRect();
    if (q.width < 2 || q.height < 2) continue;
    t = Math.min(t, q.top + scrollY); b = Math.max(b, q.bottom + scrollY);
    l = Math.min(l, q.left); r = Math.max(r, q.right);
  }
  return [t, b, l, r];
}"""


def content_box(page):
    """내용 너비 전체를 16:9로 담는 영역 (내용이 낮으면 위아래 여백을 고르게, 높으면 위쪽부터)"""
    W, H = THUMB_W, THUMB_H
    full = {'x': 0, 'y': 0, 'width': W, 'height': W * 9 / 16}
    try:
        t, b, l, r = page.evaluate(CONTENT_JS)
    except Exception:  # noqa: BLE001
        return full
    if not (t < b and l < r):
        return full
    l, r = max(0, l - 12), min(W, r + 12)
    w = r - l
    h = w * 9 / 16
    ch = b - t + 24
    top = (t - 12) - max(0, (h - ch) / 2)
    return {'x': l, 'y': max(0, top), 'width': w, 'height': h}


def check_browser(site, make_thumbs):
    from playwright.sync_api import sync_playwright

    thumbs_path = os.path.join(ROOT, 'data/thumbs.js')
    old = {}
    if os.path.isfile(thumbs_path):
        m = re.search(r'\{[\s\S]*\}', open(thumbs_path, encoding='utf8').read())
        old = json.loads(m.group(0)) if m else {}
    thumbs = {}
    os.makedirs(os.path.join(ROOT, 'thumbs'), exist_ok=True)

    srv, base = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': THUMB_W, 'height': THUMB_H}, device_scale_factor=0.5)
        for s in site['sims']:
            f, sid = s.get('file'), s.get('id')
            if s.get('status') != 'ready' or not f or not os.path.isfile(os.path.join(ROOT, f)):
                continue
            h = file_hash(os.path.join(ROOT, f))
            page = ctx.new_page()
            problems = []
            page.on('pageerror', lambda e, pr=problems: pr.append('스크립트 오류: ' + str(e).split('\n')[0][:200]))
            page.on('console', lambda m, pr=problems: m.type == 'error' and 'favicon' not in m.text
                    and 'Failed to load resource' not in m.text
                    and pr.append('콘솔 오류: ' + m.text[:200]))

            def on_response(r, pr=problems):
                u = urlparse(r.url)
                if r.status >= 400 and u.hostname == '127.0.0.1' and not u.path.endswith('favicon.ico'):
                    pr.append(f'불러오지 못한 파일 ({r.status}): {unquote(u.path)}')
            page.on('response', on_response)
            try:
                page.goto(base + quote(f), wait_until='load', timeout=20000)
                page.wait_for_timeout(WAIT_MS)
            except Exception as e:  # noqa: BLE001
                problems.append('열리지 않습니다: ' + str(e).split('\n')[0][:200])
            # 사이트 안의 링크(../../course.html 등)가 실제로 있는지
            for href in page.eval_on_selector_all('a[href]', 'els => els.map(e => e.href)') if not problems else []:
                u = urlparse(href)
                if u.hostname == '127.0.0.1' and not os.path.exists(os.path.join(ROOT, unquote(u.path).lstrip('/'))):
                    problems.append('깨진 링크: ' + unquote(u.path))
            for pr in dict.fromkeys(problems):
                err(sid, pr)

            if make_thumbs:
                out = os.path.join(ROOT, 'thumbs', sid + '.jpg')
                if old.get(sid) == h and os.path.isfile(out):
                    thumbs[sid] = h
                elif not problems:
                    page.screenshot(path=out, type='jpeg', quality=70, full_page=True, clip=content_box(page))
                    thumbs[sid] = h
                    print('  썸네일', sid)
            page.close()
        browser.close()
    srv.shutdown()

    if make_thumbs:
        # 목록에서 빠진 시뮬레이션의 썸네일은 지움
        for n in os.listdir(os.path.join(ROOT, 'thumbs')):
            if n.endswith('.jpg') and n[:-4] not in thumbs:
                os.remove(os.path.join(ROOT, 'thumbs', n))
        with open(thumbs_path, 'w', encoding='utf8') as fp:
            fp.write('// 자동 생성 파일 (tools/check_site.py) — 시뮬레이션 id: 썸네일 버전\n')
            fp.write('window.THUMBS = ' + json.dumps(dict(sorted(thumbs.items())), indent=0, ensure_ascii=False) + ';\n')


def main():
    make_thumbs = '--thumbs' in sys.argv
    site = load_site()
    t0 = time.time()
    check_list(site)
    if '--no-browser' not in sys.argv:
        check_browser(site, make_thumbs)

    health = {
        'checkedAt': datetime.now(KST).strftime('%Y-%m-%d %H:%M'),
        'commit': os.environ.get('GITHUB_SHA', '')[:7],
        'total': len(site['sims']),
        'errors': errors,
        'warnings': warnings,
    }
    with open(os.path.join(ROOT, 'data/health.json'), 'w', encoding='utf8') as fp:
        json.dump(health, fp, ensure_ascii=False, indent=1)

    title = {s['id']: s.get('title', '') for s in site['sims']}
    lines = [f"## 사이트 점검 결과 ({health['checkedAt']})", '',
             f"시뮬레이션 {len(site['sims'])}개 · 오류 {len(errors)} · 주의 {len(warnings)} · {time.time() - t0:.0f}초", '']
    for kind, items in (('오류', errors), ('주의', warnings)):
        if items:
            lines.append(f'### {kind}')
            lines += [f"- {('**' + title.get(x['id'], x['id']) + '** (' + x['id'] + '): ') if x['id'] else ''}{x['msg']}" for x in items]
            lines.append('')
    report = '\n'.join(lines)
    print(report)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf8') as fp:
            fp.write(report + '\n')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
