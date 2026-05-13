# 도전! 미니게임 v2.1 — 업데이트 빌드 매뉴얼

> 대상: 개발 경험이 없어도 순서대로 따라하면 됩니다.  
> 예상 소요 시간: 30~60분 (Flutter 최초 설치 시 60분)

---

## 0. 시작 전 확인

아래 두 가지가 PC에 설치되어 있어야 합니다.

| 필요한 것 | 설치 여부 확인 방법 |
|-----------|-------------------|
| **Flutter SDK** | 터미널(명령 프롬프트)에서 `flutter --version` 입력 → 버전 숫자가 보이면 OK |
| **Android Studio** | 바탕화면에 Android Studio 아이콘이 있으면 OK |

❌ Flutter가 없다면 → https://docs.flutter.dev/get-started/install/windows 에서 설치  
❌ Android Studio가 없다면 → https://developer.android.com/studio 에서 설치

---

## 1. 기존 Flutter 프로젝트 폴더 열기

1. 내 PC에서 기존 Flutter 앱 프로젝트 폴더를 찾습니다.  
   (예: `C:\Users\사용자이름\Desktop\mini_games_app` 또는 Documents 안)

2. 폴더 안에 아래 파일들이 있으면 맞는 폴더입니다:
   ```
   mini_games_app/
   ├── pubspec.yaml        ← 있어야 함
   ├── lib/
   │   └── main.dart       ← 있어야 함
   └── android/
       └── app/
           └── src/
               └── main/
                   └── AndroidManifest.xml
   ```

---

## 2. 파일 교체 (핵심 작업)

아래 파일들을 **덮어쓰기**합니다.  
GitHub에서 `flutter-app/` 폴더를 열어 파일을 직접 복사하거나, 내용을 복사-붙여넣기하세요.

### 2-1. `pubspec.yaml` 교체

- **위치**: 프로젝트 루트 폴더 (예: `mini_games_app/pubspec.yaml`)
- **방법**: `flutter-app/pubspec.yaml` 내용으로 덮어쓰기

### 2-2. `lib/main.dart` 교체

- **위치**: `mini_games_app/lib/main.dart`
- **방법**: `flutter-app/lib/main.dart` 내용으로 덮어쓰기
- ⚠️ 기존 파일을 **완전히 삭제**하고 새 파일로 교체하세요

### 2-3. `lib/services/ad_manager.dart` 교체

- **위치**: `mini_games_app/lib/services/ad_manager.dart`
- **방법**: `flutter-app/lib/services/ad_manager.dart` 내용으로 덮어쓰기

### 2-4. `AndroidManifest.xml` 교체

- **위치**: `mini_games_app/android/app/src/main/AndroidManifest.xml`
- **방법**: `flutter-app/android/app/src/main/AndroidManifest.xml` 내용으로 덮어쓰기

### 2-5. 불필요한 파일 삭제 (선택)

아래 파일들은 더 이상 사용하지 않으므로 삭제해도 됩니다.  
삭제하지 않아도 빌드에는 영향 없습니다.

```
lib/screens/          ← 폴더 전체 삭제 가능
lib/models/           ← 폴더 전체 삭제 가능
lib/theme/            ← 폴더 전체 삭제 가능
lib/widgets/          ← 폴더 전체 삭제 가능
```

---

## 3. Android 최소 SDK 버전 확인

1. `mini_games_app/android/app/build.gradle` 파일을 메모장으로 엽니다.

2. 아래 부분을 찾아서 숫자가 **21 이상**인지 확인합니다:
   ```gradle
   minSdkVersion 21    ← 21 이상이어야 함 (webview_flutter 요구사항)
   ```

3. 만약 숫자가 21보다 작으면 21로 바꾸고 저장합니다.

---

## 4. 패키지 설치

1. 터미널(명령 프롬프트)을 열고 프로젝트 폴더로 이동합니다:
   ```
   cd C:\Users\사용자이름\Desktop\mini_games_app
   ```
   (실제 경로에 맞게 입력하세요)

2. 아래 명령어를 입력하고 Enter:
   ```
   flutter pub get
   ```

3. 완료 메시지가 나오면 성공입니다. 에러가 나오면 아래 문제 해결 섹션을 참고하세요.

---

## 5. 에뮬레이터 또는 실제 기기에서 테스트

### 실제 Android 폰으로 테스트 (추천)

1. 폰에서 **개발자 옵션 → USB 디버깅** 활성화  
   (설정 → 휴대전화 정보 → 빌드번호 7번 탭 → 개발자 옵션 생성)

2. USB로 PC에 연결

3. 터미널에서:
   ```
   flutter run
   ```

4. 앱이 폰에 설치되고 웹게임 화면이 뜨면 성공!

---

## 6. 릴리즈 APK 빌드 (Google Play 업로드용)

### 6-1. 서명 키 확인

기존에 Google Play에 배포한 앱이 있으면 **반드시 기존 키스토어**를 사용해야 합니다.  
기존 키스토어 파일(`.jks` 또는 `.keystore`)을 준비하세요.

`android/app/build.gradle` 에서 signingConfig 설정이 있는지 확인합니다.

### 6-2. APK 빌드

```
flutter build apk --release
```

완료되면 아래 경로에 APK가 생성됩니다:
```
build/app/outputs/flutter-apk/app-release.apk
```

### 6-3. AAB 빌드 (Google Play 권장 방식)

```
flutter build appbundle --release
```

완료되면:
```
build/app/outputs/bundle/release/app-release.aab
```

이 파일을 Google Play Console에 업로드하면 됩니다.

---

## 7. Google Play Console 업데이트 업로드

1. [Google Play Console](https://play.google.com/console) 접속

2. 앱 선택 → **프로덕션** (또는 내부 테스트)

3. **새 버전 만들기** 클릭

4. `app-release.aab` 파일 업로드

5. 버전 정보 입력:
   - 버전 이름: `2.1.0`
   - 변경 내용: `웹게임 서비스로 전면 개편, 다양한 게임 추가`

6. **검토 후 출시** 클릭

---

## 8. 광고 동작 방식

| 방식 | 설명 |
|------|------|
| **타이머 광고** | 앱 실행 후 4분마다 자동으로 전면 광고 1회 표시 |
| **JS 브리지 광고** | 웹앱에서 `window.AdBridge.postMessage('showAd')` 호출 시 즉시 표시 |

웹앱(game.luckygrampus.com)에서 게임 종료 시점에 아래 코드 한 줄을 추가하면 게임 끝날 때마다 광고를 표시할 수 있습니다:
```javascript
// 웹앱 게임 오버 코드에 추가
if (window.AdBridge) window.AdBridge.postMessage('showAd');
```

---

## 9. 자주 발생하는 문제

### `flutter pub get` 실패 시
```
flutter clean
flutter pub get
```

### "minSdkVersion" 에러 시
`android/app/build.gradle` 에서 `minSdkVersion`을 21로 변경

### 앱에서 흰 화면만 나오는 경우
인터넷 연결 확인 후, `game.luckygrampus.com` 주소가 정상 접속되는지 브라우저에서 먼저 확인

### Google 로그인 팝업이 안 뜨는 경우
WebView에서 팝업 창 처리에 제한이 있을 수 있습니다.  
웹앱 개발자에게 `signInWithRedirect` 방식으로 변경 요청하거나,  
아래 패키지 추가를 검토하세요: `webview_flutter_android`

---

## 10. 파일 구조 최종 확인

교체 완료 후 `lib/` 폴더 구조:
```
lib/
├── main.dart              ← ✅ 새 파일 (WebView 앱)
└── services/
    └── ad_manager.dart    ← ✅ 새 파일 (광고 관리)
```

---

문의사항이 있으면 사장님 채널로 연락주세요! 🎮
