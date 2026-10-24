#!/usr/bin/env python3
"""sim-kit 시뮬레이션 검사: 열어 보고, 구조를 확인하고, 탭마다 화면을 찍습니다.

    python3 tools/sim-kit/test_sim.py sims/fluid/el-nino.html [...]

확인하는 것
  - 스크립트 오류·콘솔 오류
  - 1920×1080 틀, 전체화면 버튼, ①②③ 탭, 예측 선택지, 미션 3개 이상
  - 각 탭에서 오른쪽 패널이 넘치는 정도(px) — 0이면 스크롤 없이 다 보임
  - 캔버스가 그림 칸 안에서 차지하는 비율
  - 예측 보기를 하나 골랐을 때 [실험하러 가기]가 나오는지, 미션이 처음부터 달성되어 있지 않은지
화면: tools/sim-kit/_shots/<파일이름>_predict.png · _lab.png · _mission.png  (Read 도구로 직접 보고 확인하세요)
"""
import functools
import http.server
import os
import sys
import threading
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, 'tools/sim-kit/_shots')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main(files):
    from playwright.sync_api import sync_playwright
    os.makedirs(SHOTS, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}/'
    bad = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for f in files:
            f = os.path.relpath(os.path.abspath(f), ROOT).replace(os.sep, '/')
            name = os.path.splitext(os.path.basename(f))[0]
            pg = b.new_page(viewport={'width': 1600, 'height': 900})
            errs = []
            pg.on('pageerror', lambda e: errs.append('스크립트 오류: ' + str(e).split('\n')[0][:220]))
            pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append('콘솔: ' + m.text[:220]))
            pg.goto(base + quote(f)); pg.wait_for_timeout(1500)
            info = pg.evaluate("""() => {
              const w = document.getElementById('presentation-wrapper');
              const st = document.querySelector('.slide.active .sim-stage'), cv = st && st.querySelector('canvas');
              return {
                wrapper: w ? [w.offsetWidth, w.offsetHeight] : null,
                fsBtn: !!document.getElementById('fsBtn'),
                kit: !!document.querySelector('style#sim-kit') && (document.querySelector('style#sim-kit').textContent.length > 1000),
                tabs: [...document.querySelectorAll('.sim-tab')].map(t => t.dataset.tab),
                opts: document.querySelectorAll('#predictBox .predict-opt').length,
                missions: document.querySelectorAll('#missionBox .mission-list li').length,
                doneAtStart: document.querySelectorAll('#missionBox .mission-list li.done').length,
                canvasFill: (st && cv) ? Math.round(cv.getBoundingClientRect().width * cv.getBoundingClientRect().height / (st.getBoundingClientRect().width * st.getBoundingClientRect().height) * 100) : null,
                realBox: !!document.querySelector('.real-src'),
                slideX: document.querySelectorAll('.slide-x, .slide:not(.active)').length,
              };
            }""")
            over = {}
            for tab in ['predict', 'lab', 'mission']:
                if pg.query_selector(f'.sim-tab[data-tab="{tab}"]'):
                    pg.click(f'.sim-tab[data-tab="{tab}"]'); pg.wait_for_timeout(450)
                    over[tab] = pg.evaluate("() => { const p = document.querySelector('.slide.active .sim-panel'); return p ? p.scrollHeight - p.clientHeight : null; }")
                    pg.screenshot(path=os.path.join(SHOTS, f'{name}_{tab}.png'))
            go_ok = None
            if info['opts']:
                pg.click('.sim-tab[data-tab="predict"]'); pg.wait_for_timeout(300)
                pg.click('#predictBox .predict-opt >> nth=0'); pg.wait_for_timeout(400)
                go_ok = pg.evaluate("() => { const g = document.querySelector('#predictBox .predict-go'); const r = document.querySelector('#predictBox .predict-result'); return (g && !g.hidden) || (r && !r.hidden); }")
            pg.wait_for_timeout(600)
            errs = list(dict.fromkeys(errs))
            probs = []
            if info['wrapper'] != [1920, 1080]: probs.append(f"틀 크기 {info['wrapper']} (1920×1080이어야 함)")
            if not info['fsBtn']: probs.append('전체화면 버튼 없음')
            if not info['kit']: probs.append('sim-kit 스타일이 비어 있음 (apply.py 실행)')
            if info['tabs'] != ['predict', 'lab', 'mission']: probs.append(f"탭 {info['tabs']}")
            if info['opts'] < 2: probs.append('예측 선택지 없음')
            if info['missions'] < 3: probs.append(f"미션 {info['missions']}개 (3개 이상)")
            if info['doneAtStart']: probs.append(f"처음부터 달성된 미션 {info['doneAtStart']}개")
            if not info['realBox']: probs.append('실제 자료(.real-src) 없음')
            if info['slideX']: probs.append(f"숨은 슬라이드 {info['slideX']}개 남음")
            if go_ok is False: probs.append('예측을 골라도 [실험하러 가기]가 안 나옴')
            for t, v in over.items():
                if v and v > 120: probs.append(f'{t} 탭 패널이 {v}px 넘침 (줄이기 권장)')
            probs += errs
            bad += bool(probs)
            print(f"{'OK ' if not probs else '!! '} {f}  캔버스 {info['canvasFill']}% · 넘침 {over}")
            for x in probs: print('     -', x)
            pg.close()
        b.close()
    srv.shutdown()
    print(f'\n{len(files)}개 중 문제 있음 {bad}개 · 화면: {os.path.relpath(SHOTS, ROOT)}/')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
