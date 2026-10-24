#!/usr/bin/env python3
"""sim-kit 넣기: 시뮬레이션 파일 안의 표시된 자리에 공통 스타일·도구·화면 맞춤 코드를 채웁니다.

    python tools/sim-kit/apply.py sims/fluid/el-nino.html ...   # 지정한 파일만
    python tools/sim-kit/apply.py --all                         # sim-kit 표시가 있는 모든 시뮬레이션

시뮬레이션 파일에는 아래 세 자리가 있어야 합니다(내용은 비워 둬도 됨).
    <style id="sim-kit"></style>
    <script id="sim-kit"></script>
    <script id="sim-kit-fit"></script>
공통 디자인을 바꾸려면 tools/sim-kit/kit.css · kit.js · kit-fit.js 를 고친 뒤 --all 로 다시 실행하세요.
각 시뮬레이션 파일은 여전히 파일 하나로 완결되어(인터넷 없이 실행) 내려받기에 문제가 없습니다.
"""
import glob
import os
import re
import sys

KIT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(KIT))
read = lambda n: open(os.path.join(KIT, n), encoding='utf8').read().strip()
PARTS = [
    (r'(<style id="sim-kit">)[\s\S]*?(</style>)', 'kit.css'),
    (r'(<script id="sim-kit">)[\s\S]*?(</script>)', 'kit.js'),
    (r'(<script id="sim-kit-fit">)[\s\S]*?(</script>)', 'kit-fit.js'),
]


def apply(path):
    s = open(path, encoding='utf8').read()
    out = s
    for pat, name in PARTS:
        body = read(name)
        out, n = re.subn(pat, lambda m: m.group(1) + '\n' + body + '\n' + m.group(2), out, count=1)
        if not n:
            raise SystemExit(f'{path}: {pat.split(">")[0][3:]}> 자리가 없습니다')
    if out != s:
        open(path, 'w', encoding='utf8').write(out)
        return True
    return False


def main():
    args = sys.argv[1:]
    if args == ['--all']:
        files = [f for f in glob.glob(os.path.join(ROOT, 'sims/**/*.html'), recursive=True)
                 if '<style id="sim-kit">' in open(f, encoding='utf8').read()]
    else:
        files = args
    changed = sum(apply(f) for f in files)
    print(f'sim-kit: {len(files)}개 중 {changed}개 갱신')


if __name__ == '__main__':
    main()
