# 수익화 1단계: 이용 분석 + 선택형 보상 광고

## 현재 동작과 실제 연결 상태

- 모든 놀이와 기본 별사탕 보상은 무료입니다.
- GA4는 설정과 이용자 동의가 모두 있을 때만 로드됩니다. 동의 이전 행동은 모으거나 나중에 재전송하지 않습니다.
- 보상형 광고는 일반 이용자 대상 설정과 유효한 Google Ad Manager 경로가 있을 때 결과 화면에만 표시됩니다. 광고 제공 동의는 분석 동의와 별개입니다.
- 광고 시청은 직접 선택합니다. 광고 준비 후 시청 버튼을 누르면 표시됩니다. 강제 전면광고나 게임 중 광고는 없습니다.
- 현재 환경에는 GA4 측정 ID, Ad Manager 보상형 광고 경로, 연결된 Vercel 프로젝트가 없습니다. 따라서 라이브 분석·광고 수익·공개 배포는 아직 검증하지 않았습니다.
- 단위/브라우저 테스트는 모의 SDK로 검증합니다. 실제 광고 조회수나 광고 수익을 만들지 않습니다.

## 필요한 설정

`.env.example`를 참고해 로컬에서는 `.env.local`, 배포에서는 해당 호스팅 프로젝트의 환경변수에 설정합니다. Vite 환경변수는 빌드에 포함되므로 변경 후 다시 빌드·배포합니다.

| 이름 | 입력할 값 | 역할 |
| --- | --- | --- |
| `VITE_MONETIZATION_AUDIENCE` | 대상 확정 후 `general` | 일반 이용자 대상 통합 활성화. 기본 `unconfirmed`, `children`은 외부 분석·광고 비활성화 |
| `VITE_GA_MEASUREMENT_ID` | 운영자의 GA4 웹 스트림 `G-…` ID | 이용 분석 |
| `VITE_REWARDED_AD_UNIT_PATH` | 운영자의 Google Ad Manager `/숫자네트워크코드/광고단위` | 웹 보상형 광고 |

어린이를 주 대상으로 정한 경우 이 구현에서 `general`로 설정하지 않습니다. 어린이 대상 광고 공급·연령별 개인정보 설정은 별도 준비가 필요합니다. 이 사이트의 선택 설정은 제품 내 선택을 제어하며, 지역별 Google 인증 CMP 요구사항까지 구현하거나 보장하지 않습니다. 실제 송출 전 대상 지역과 계정 요구사항에 맞는 CMP를 연결하고, 운영자 정보·문의처를 포함한 개인정보 안내를 확정해야 합니다.

기존 `public/ads.txt`의 게시자 행은 보존했습니다. **그 ID가 새 Ad Manager 계정과 일치하는지는 미확인**입니다. 승인된 계정에서 제공한 정확한 ads.txt 행으로 확인·갱신하세요. 이전 `ad_manager.js`의 일반 광고+타이머 보상과 Flutter 전면광고 브리지는 새 놀이터에서 호출하지 않습니다. Google AdSense/AdMob 승인이 Ad Manager 웹 보상 광고 승인을 뜻하지 않습니다.

## 광고 보상 계약

결과 화면에서 광고를 선택하면 GPT `OutOfPageFormat.REWARDED` 슬롯을 요청합니다. 준비 완료 후 이용자가 시청 버튼을 누릅니다.

1. 요청한 슬롯의 `rewardedSlotGranted`를 받아야 보상 자격이 생깁니다.
2. 해당 슬롯이 닫힌 후에만 기본 라운드 보상과 같은 수의 별사탕을 추가합니다.
3. 동영상 완료 이벤트나 시간 경과만으로는 지급하지 않습니다.
4. 닫기만 했을 때, 광고 없음, 미지원, 로딩 오류, 시간 초과, 화면 이탈, 동의 철회에는 추가 보상이 없습니다.
5. 완료된 라운드 ID의 `adBonusClaimed`를 저장하므로 중복 콜백과 새로고침으로 재지급하지 않습니다.
6. 기본 보상과 게임 진행은 광고 상태와 무관하게 사용할 수 있습니다.

현재 별사탕은 브라우저 로컬의 무료 가상 재화입니다. 개발자 도구로 로컬 데이터를 바꿀 수 있으므로 유료 재화·환전·구매 권리 검증에 사용하면 안 됩니다. 현금 결제 상품은 이 단계에 넣지 않았습니다. 유료 꾸미기를 출시하려면 계정, 서버 구매 검증, 환불·복원 절차를 먼저 구현합니다.

공식 구현 참조: https://github.com/googleads/google-publisher-tag-samples/blob/main/samples/display-rewarded-ad/sample.ts

## 분석 이벤트

| 이벤트 | 의미 / 주요 필드 |
| --- | --- |
| `playground_visit` | 동의 후 페이지 방문. 유저·세션 구분은 GA4에 맡김 |
| `game_select` | 게임 소개 진입 / `game_id` |
| `game_start` | 실제 라운드 시작 / `game_id` |
| `game_retry` | 종료한 판에서 바로 재도전 / `game_id` |
| `game_end` | 정상 종료 / `game_id`, `score`, `duration_seconds`, `end_reason` |
| `game_abandon` | 완료 전 홈 이동·페이지 이탈 / `game_id`, `duration_seconds` |
| `daily_gift_claim` | 실제 선물 지급 / `reward_amount` |
| `skin_unlock` | 별사탕으로 색상 해금 / `skin_id`, `coin_cost` |
| `skin_equip` | 소유한 색상 다시 장착 / `skin_id` |
| `reward_ad_offer` | 광고 선택 UI 노출 / `game_id` |
| `reward_ad_request`, `reward_ad_ready`, `reward_ad_show` | 광고 요청→준비→시청 단계 |
| `reward_ad_result` | 공급자 결과 / `ad_status`, 실제 추가 `reward_amount` |

허용된 이벤트·필드만 전송합니다. 이름, 이메일, UID, 임의 텍스트, Firebase 키는 이벤트에 포함하지 않습니다. Google 신호와 광고 개인 최적화는 끄고, 분석 동의 철회 시 이벤트 전송을 중단하고 이 사이트의 GA 쿠키 제거를 시도합니다. Google SDK가 처리하는 기기·접속 정보는 별도이므로 개인정보 안내에 포함했습니다.

### GA4에서 먼저 볼 보고서

GA4 관리의 맞춤 정의에 이벤트 범위 `game_id`, `end_reason`, `ad_status`, `skin_id`를 등록하고 `duration_seconds`, `reward_amount`, `coin_cost`를 필요한 맞춤 측정항목으로 등록합니다.

- **다음 날 재방문율:** 동의 이용자 코호트의 D1 유지율. `playground_visit` 이벤트 수를 사람 수로 해석하지 않습니다.
- **게임별 라운드 종료율:** `game_end / game_start`. 시간 완주를 보려면 `end_reason`이 `time` 또는 `complete`인 종료를 분리합니다. `lives`는 기회 소진 종료입니다.
- **이용자당 플레이:** `game_start` 수 / 동의한 활성 이용자 수.
- **재도전율:** `game_retry / game_end`.
- **광고 선택·시청·보상 전환:** offer → request → show → result(`rewarded`). 광고 동의와 분석 동의가 달라 분석에 기록되지 않는 시청도 있을 수 있습니다.
- **실제 수익:** Ad Manager 보고서에서 확인합니다. 로컬 보상 수나 광고 성공 이벤트를 원화 수익으로 표시하지 않습니다.

개발 서버·자동 테스트 데이터는 운영 보고서에서 제외합니다. 초기에는 적은 수의 사람으로 플레이 난이도를 확인하고, 공개 후 동일한 관찰 기간의 재방문과 완주율을 비교해 가장 인기 있는 게임을 개선합니다. 현재 실제 이용 데이터는 없습니다.

## 배포 절차와 외부 연결

`vercel.json`의 빌드 명령은 `npm run build`, 결과 폴더는 `dist`입니다. 현재 작업물은 로컬 변경사항이며 GitHub에 푸시하거나 공개 배포하지 않았습니다. Vercel에서 저장소를 연결하기 전에 이 변경사항이 배포 대상 브랜치에 포함되어야 합니다.

1. 변경사항 검토 후 배포할 브랜치에 반영합니다.
2. 운영자의 Vercel 프로젝트를 연결하고 위의 공개 환경변수를 설정합니다.
3. 일반 이용자 대상 여부, 개인정보 안내, 필요한 CMP 및 광고 계정 승인을 확인합니다.
4. 먼저 분석만 연결해 테스트용 스트림에서 동의 전 요청 없음, 동의 후 이벤트, 철회를 확인합니다.
5. Google 공식 테스트용 광고로 준비·취소·완료 흐름을 수동 확인한 후 운영 단위로 전환합니다. 라이브 광고를 반복 클릭하거나 자동 테스트하지 않습니다.
6. 공개 배포 후 실제 기기·도메인에서 GA4와 광고 공급을 확인합니다. 코드 빌드 성공은 계정 승인이나 광고 재고 확보를 뜻하지 않습니다.

현재 클라우드는 Vercel 프로젝트 연결·인증 정보가 없어서 배포하지 못했습니다. 브라우저 설정에 GA/광고 ID를 추가하는 것만으로 현재 실행 환경이나 공개 사이트가 자동 변경되지는 않습니다.

필요한 외부 SDK 호스트는 `www.googletagmanager.com`, `www.google-analytics.com`, `region1.google-analytics.com`, `securepubads.g.doubleclick.net`입니다. 광고 공급 과정의 추가 도메인은 계정과 재고에 따라 달라 실제 연결 시 확인합니다. 현재 네트워크 허용 목록은 임의로 확장하지 않았습니다.

## 재현 가능한 검증

```sh
node --test tests/playground.test.js tests/monetization.test.js
npx eslint src/playground src/monetization tests/monetization.test.js
npm run build
# 아래는 Vite 5173 포트 실행, Python Playwright와 Chromium 설치 후
python tests/playground_smoke.py
python tests/monetization_smoke.py
```

수익화 브라우저 테스트는 테스트용 설정과 모의 GPT/GA 스크립트를 네트워크 경로에서 대체합니다. 공급자 계약을 검증하며, 라이브 광고 송출·GA4 수집·실제 매출을 검증하는 테스트는 아닙니다.
