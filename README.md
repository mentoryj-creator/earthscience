# 지구과학 시뮬레이션 실험실 (2차 버전)

## 폴더 구조

```
index.html        홈 (검색, 과목별·주제별 입구)
course.html       과목 페이지   예) course.html?c=es
topic.html        주제 페이지   예) topic.html?t=astro
sim.html          시뮬레이션 보여주기 페이지 (모든 시뮬레이션이 함께 씀)
admin.html        관리 페이지 (시뮬레이션·과목·단원 편집)
data/sims.js      사이트 전체 목록 ← 메뉴·카드가 모두 여기서 만들어짐
js/site.js        공통 메뉴와 카드
css/style.css     공통 디자인
sims/solid/       고체지구 시뮬레이션 파일
sims/fluid/       유체지구 시뮬레이션 파일
sims/astro/       천문 시뮬레이션 파일
```

## 디자인 바꾸기

관리 페이지 → **사이트 디자인**에서 시안을 고르고 [GitHub에 저장]을 누르면 모든 방문자에게 적용됩니다.
`css/themes/` 안의 파일 하나가 시안 하나입니다: bento(01) · editorial(02) · brutal(03, 기본) · aurora(04) · swiss(05) · notebook(06) · console(07) · megatype(08) · clay(09) · retro(10).
주소 뒤에 `?theme=aurora`처럼 붙이면 그 창에서만 미리 볼 수 있고, `?theme=reset`으로 되돌립니다.

시뮬레이션 페이지의 **HTML 다운로드** 버튼과 카드의 **HTML 받기** 버튼은 시뮬레이션을 파일 하나로 저장합니다(인터넷 없이 열림).

## 자동 점검 · 썸네일 (GitHub Actions)

`sims/` 나 `data/sims.js` 가 바뀌어 올라올 때마다, 그리고 매주 월요일 아침에 `.github/workflows/check.yml` 이 실행됩니다.

- 모든 시뮬레이션을 브라우저로 열어 **빠진 파일 · 스크립트 오류 · 깨진 링크 · 없는 과목/단원 연결**을 찾습니다.
- 바뀐 시뮬레이션만 첫 화면을 찍어 `thumbs/<id>.jpg` 로 저장하고 `data/thumbs.js` 를 갱신합니다(카드 위 그림).
- 결과는 `data/health.json` 에 남아 관리 페이지 → **통계 · 점검** 탭에 보입니다. 오류가 있으면 GitHub가 메일로 알려 줍니다.
- 직접 돌리기: Actions 탭 → "사이트 점검 · 썸네일" → Run workflow. 내 컴퓨터에서는 `python tools/check_site.py --thumbs`.

## 그 밖의 기능

- **날짜**: 시뮬레이션마다 `added`(추가한 날) · `updated`(고친 날)를 관리 페이지가 자동으로 적습니다. 최근 2주 안에 추가된 것 중 최근 12개에 NEW 표시.
- **QR 코드**: 시뮬레이션 페이지 [QR 코드] → 학생 휴대폰으로 바로 열기. (`js/vendor/qrcode.js`, MIT)
- **단원 전체 받기**: 과목 · 주제 페이지의 단원 제목 옆 [전체 받기 (ZIP)]. 압축 안에 `00 목록.html` 이 함께 들어갑니다.
- **오류 신고**: 관리 페이지 → "오류 신고 받을 곳"에 구글 폼 주소를 넣으면 그쪽으로, 비우면 GitHub 이슈로 연결됩니다.
- **저장 기록**: 관리 페이지 → 저장 기록 탭에서 예전 목록을 불러와 되돌릴 수 있습니다(GitHub 연결 필요).

## 내 도메인으로 옮길 때

1. 도메인 업체에서 DNS를 GitHub Pages로 연결 (GitHub 문서 "Managing a custom domain for your GitHub Pages site").
2. 저장소 Settings → Pages → Custom domain 에 도메인 입력, **Enforce HTTPS** 켜기 (저장소에 `CNAME` 파일이 생김).
3. GoatCounter 설정에서 사이트 주소를 새 도메인으로 바꾸기.
사이트 안의 주소는 모두 상대 주소라 따로 고칠 곳은 없습니다. QR 코드와 내려받은 파일 속 링크도 새 주소로 만들어집니다.

## 새 시뮬레이션 추가하는 법

1. 관리 페이지의 "Claude에게 붙여 넣을 문구"를 복사해 Claude에게 시뮬레이션을 요청합니다.
2. 받은 HTML 파일을 관리 페이지 → [+ 새 시뮬레이션]에서 고르고, 제목·과목·단원·설명을 채웁니다.
3. [GitHub에 저장]을 누르면 1~2분 뒤 사이트에 반영됩니다.

GitHub 연결 없이 하려면 [sims.js 내려받기] 후 `data/sims.js`와 시뮬레이션 파일을 저장소에 직접 올리면 됩니다.

## 1차 버전에서 바꿀 때

저장소에 있던 `astronomy/`, `template/` 폴더는 더 이상 쓰지 않으니 지워도 됩니다.
