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

## 새 시뮬레이션 추가하는 법

1. 관리 페이지의 "Claude에게 붙여 넣을 문구"를 복사해 Claude에게 시뮬레이션을 요청합니다.
2. 받은 HTML 파일을 관리 페이지 → [+ 새 시뮬레이션]에서 고르고, 제목·과목·단원·설명을 채웁니다.
3. [GitHub에 저장]을 누르면 1~2분 뒤 사이트에 반영됩니다.

GitHub 연결 없이 하려면 [sims.js 내려받기] 후 `data/sims.js`와 시뮬레이션 파일을 저장소에 직접 올리면 됩니다.

## 1차 버전에서 바꿀 때

저장소에 있던 `astronomy/`, `template/` 폴더는 더 이상 쓰지 않으니 지워도 됩니다.
