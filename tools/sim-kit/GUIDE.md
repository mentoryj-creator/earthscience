# 시뮬레이션 변환 안내서 (sim-kit)

모든 시뮬레이션을 **행성우주과학 스타일**로 통일하면서, 학생이 **직접 조작하고 능동적으로 참여**하는 요소를 더합니다.
선생님(사이트 주인)의 요청: *"달의 위상 변화처럼 학생들이 좀 더 조작이 가능하고 능동적으로 참여할 수 있는 컨텐츠"*.

## 1. 먼저 꼭 볼 기준 파일

| 파일 | 무엇을 보나 |
|---|---|
| `sims/astro/moon-phase.html` | **가장 중요한 본보기.** 원래는 달을 돌리는 것뿐이었는데, "관측 시각"이라는 새 조작 변수를 더해 하늘 그림·뜨고 지는 시각까지 학생이 탐구하게 만듦 |
| `sims/solid/wegener-puzzle.html` | 흰 배경·긴 페이지(IBM Plex) 파일을 새 틀로 옮긴 예. `Lab` 도우미를 살리는 방법, 설명 상자를 그림 위 메시지로 옮긴 방법 |
| `sims/fluid/el-nino.html` | 이미 1920 틀이던 파일(숨은 강의 슬라이드 있음)을 정리한 예. 실제 자료(NOAA ONI) 버튼 |
| `tools/sim-kit/kit.css` · `kit.js` · `kit-fit.js` | 공통 스타일·도구. **고치지 마세요**(필요하면 보고서에 제안) |

## 2. 파일 뼈대 (반드시 이 구조)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>시뮬레이션 제목</title>
<link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap" rel="stylesheet">
<style id="sim-kit"></style>
<style>
  /* 이 시뮬레이션만의 스타일 */
</style>
</head>
<body>
<div id="presentation-wrapper">
<button class="fs-btn" id="fsBtn" type="button">⛶ 전체화면</button>
<div class="slide sim-slide active" id="slideMain">
  <div class="ppt-title"><span class="sim-tag">시뮬레이션</span>제목</div>
  <div class="ppt-subtitle">한 줄 안내 (핵심어는 <span class="or">주황</span>)</div>
  <div class="sim-wrap">
    <div class="sim-stage"><canvas id="cv" width="1160" height="860"></canvas><div class="sim-hint">조작 힌트</div></div>
    <div class="sim-panel">
      <div class="sim-tabs">
        <button class="sim-tab on" data-tab="predict">① 예측</button>
        <button class="sim-tab" data-tab="lab">② 실험</button>
        <button class="sim-tab" data-tab="mission">③ 미션</button>
      </div>
      <div class="sim-tabpage" data-page="predict"><div class="sim-box" id="predictBox"></div></div>
      <div class="sim-tabpage" data-page="lab"> …조작 상자들(.sim-box)… </div>
      <div class="sim-tabpage" data-page="mission"><div class="sim-box" id="missionBox"></div></div>
      <div class="sim-note">※ 단순화 모형 안내 한 줄</div>
    </div>
  </div>
</div>
</div>
<script id="sim-kit"></script>
<script> /* 시뮬레이션 코드 */ </script>
<script id="sim-kit-fit"></script>
</body>
</html>
```

- `.ppt-title`은 화면에 안 보입니다(사이트가 제목을 보여 줌). 그래도 넣어 두세요.
- 밝은 그림이면 `<div class="sim-stage light">`.
- 그림 칸은 약 **1170 × 880**(1920 화면 기준)입니다. 캔버스는 이 비율에 가깝게(예: 1160×860, 1160×800) 만들어 칸을 꽉 채우세요. 원래 그림이 작으면 좌표를 키우거나 남는 공간에 새 그림(그래프·관측 화면 등)을 더하세요. 캔버스 글자는 1160 폭 기준 **18px 이상**.
- 오른쪽 패널은 600px. 각 탭이 **스크롤 없이** 들어가게(검사 도구가 120px 넘으면 경고). 넘치면 설명을 그림 위 메시지(`.sim-hint`, 위치 지정한 `.sim-box`)로 옮기거나, 실제 자료 상자를 ① 예측 탭 아래로 옮기세요.
- 사용 가능한 공통 클래스: `.sim-box(.blue/.key)`, `h4`, `.sim-row > .lbl`, `input.sim-range`, `.sim-val`, `.sim-btns > .sim-btn(.on/.orange)`, `.sim-table`, `.sim-big`, `.sim-note`, `.chip(.b/.o)`, `.hl`, `.or`, `.real-src`.
- 그 뒤 `python3 tools/sim-kit/apply.py <내 파일>`로 공통 블록을 채웁니다. **`--all` 금지**(다른 작업자 파일까지 건드림).

## 3. 공통 도구 (kit.js)

```js
SIM.loop('slideMain', (t, dt) => { … });         // 그리기 반복
const S = SIM.stage({ canvas, W: 1160, H: 860 }); // 고해상도 캔버스: S.begin() 후 W×H 좌표로 그림, S.pt(e) → {x,y}
SIM.pos(e, canvas)                                // 캔버스 width/height 좌표로 변환(캔버스 크기 그대로 쓸 때)
SIM.font(22) / SIM.font(18, false)                // 고운돋움 굵게/보통
SIM.clamp, SIM.lerp, SIM.rng(seed), SIM.fmtExp(v)
SIM.tabs();                                       // 탭 연결 (predict/missions 전에 호출)
SIM.predict({ el:'#predictBox', q, options:[…], answer, why, setup, reached });
SIM.missions({ el:'#missionBox', items:[{ t, hint, test }] });
SIM.toast('글', 'info'|'warn')                    // 그림 위 알림
```

- **predict**: `setup()`은 실험을 *확인 상태가 아닌* 곳으로 맞추고, `reached()`는 학생이 직접 조작해 그 조건을 만들었을 때 true. 시작부터 true였던 조건은 한 번 false가 된 뒤에야 인정됩니다. `reached`를 줄 수 없으면 생략(그러면 [결과 보기] 버튼).
- **missions**: `test()`는 0.25초마다 호출. 열자마자 true인 조건은 세지 않습니다(학생이 만들어야 함). 3~4개, 쉬움 → 어려움. 마지막 하나는 "실제 자료 모두 불러오기"처럼 탐색을 끝까지 하게 만드는 것도 좋습니다.

## 4. 반드시 더할 것 (시뮬레이션마다)

1. **새 조작 하나 이상** ← 가장 중요. 원래보다 학생이 *더 많이 손댈 수 있게*.
   예: 새 변수 슬라이더, 캔버스에서 끌기·놓기·찍어서 측정하기, 시간 흐름 조절(재생/빨리 감기/되감기), 관측자 시점 바꾸기, 비교용 두 번째 조건(A/B) 나란히 보기, 학생이 값을 기록해 그래프가 그려지는 기록표, 자로 재거나 각도를 맞추는 도구. 달의 위상의 "관측 시각 → 하늘 그림"처럼 *개념을 한 단계 넓히는* 조작이면 가장 좋습니다.
2. **① 예측 질문 1개**: 오개념을 건드리는 질문, 보기 3~4개, `why`에는 짧고 정확한 설명(교과서 수준). 정답 위치를 섞으세요(항상 B가 아니도록).
3. **③ 도전 미션 3~4개**: 조작으로만 달성 가능, 자동 판정. 숫자 목표("수온 편차 +2.0℃ 이상", "90초 안에")가 있으면 몰입이 큼.
4. **실제 자료·사례 상자**(`.real-src`로 출처 한 줄): 실제 관측값·사건·장소를 버튼으로 불러와 모형과 비교. **확실한 사실만**. 수치가 불확실하면 숫자를 빼고 잘 알려진 정성적 사실만 쓰거나, 계산식 기반(예: 달의 나이 계산)으로 만드세요. **절대 통계를 지어내지 마세요.**

## 5. 원래 내용 지키기

- 원래 시뮬레이션의 과학 내용·조작·그림은 **모두 살립니다**(기능을 빼지 말 것). 계산 로직은 바꾸지 말고, 틀린 과학 내용이 보이면 보고서에 적으세요.
- 말투: 학생에게 말하는 "~해요/~봐요". 화면 문구에 이모지 쓰지 않기(▶ ✓ ⟲ 같은 기호는 괜찮음).
- 외부 파일·라이브러리 추가 금지(고운돋움 글꼴만). 파일 하나로 완결.
- **1920 틀이던 파일(B 묶음)**: `.slide-x`(숨은 강의 슬라이드)와 그 코드, `<style id="standalone">`, 옛 화면 맞춤·전체화면 스크립트를 지우고 위 뼈대로 옮깁니다. 활성 시뮬레이션 슬라이드 하나만 남깁니다. 숨은 슬라이드 안에 쓸 만한 *다른 시뮬레이션*이 있으면 새 조작/미션 재료로 써도 좋습니다.
- **흰 배경 파일(C 묶음, IBM Plex · `Lab` 도우미)**: `Lab`은 살리되 `Lab.stage`를 `function stage(opt){return SIM.stage({canvas:opt.canvas,W:opt.W,H:opt.H});}`로 바꾸고, FONT를 `"'Gowun Dodum',sans-serif"`, 다크 모드 처리 제거, 캔버스 색 변수(`--bg`, `--fg` …)는 밝은 값만 `:root`에 남깁니다. `← 목록` 링크, 사이트 연동 스크립트(sim-height)는 지웁니다(kit-fit이 함).
- 파일 안의 **제목 설명 문단·개념 설명·수업용 질문**은 버리지 말고 아래 notes 파일로 옮깁니다.

## 6. 사이트 글(notes) — `data/sims.js`는 직접 고치지 마세요

시뮬레이션마다 `tools/sim-kit/notes/<id>.json` 을 만드세요(id는 `data/sims.js`에서 file로 찾음). 나중에 한꺼번에 합칩니다.

```json
{ "id": "el-nino",
  "howto": "① 예측 탭에서 …\n② 실험 탭: **…** 슬라이더를 …\n…\n③ 미션 탭의 도전 과제를 모두 달성해 보세요.",
  "concept": "",
  "inquiry": "" }
```
- `howto`: 항상 새로 씀(새 탭·새 조작·실제 자료를 반영, 줄마다 한 단계, `**굵게**` 가능). moon-phase·el-nino 항목을 본보기로.
- `concept`, `inquiry`: `data/sims.js`의 값이 **비어 있을 때만** 파일 안 설명·질문으로 채우세요. 이미 있으면 빈 문자열로 두면 그대로 유지됩니다.

## 7. 검사 (끝났다고 하기 전에 반드시)

```
python3 tools/sim-kit/apply.py <파일들>
python3 tools/sim-kit/test_sim.py <파일들>
```
- 모든 파일이 `OK`가 될 때까지 고칩니다.
- `tools/sim-kit/_shots/<이름>_predict.png / _lab.png / _mission.png` 를 **Read 도구로 직접 보고** 글자 겹침·잘림·빈 공간·너무 작은 글자를 확인하세요. (이 작업 환경은 구글 글꼴이 막혀 기본 글꼴로 보입니다. 정상입니다.)
- 미션·예측이 실제로 달성 가능한지 코드로 따져 보세요(조작 범위 안에서 test가 true가 될 수 있는가, 시작 상태에서 바로 달성되지 않는가).

## 8. 하지 말 것

- git commit / push 금지. `apply.py --all` 금지. kit 파일·사이트 파일·다른 사람 몫의 시뮬레이션 수정 금지.
- 맡은 파일과 그 notes 파일만 만들고 고칩니다.

## 9. 보고 (마지막 메시지)

파일마다 한두 줄: **새 조작**, 예측 질문 요지, 미션 목록, 실제 자료(출처), 검사 결과, 남은 걱정(과학 내용 의문 등).
