// lib/main.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'services/ad_manager.dart';

// ─────────────────────────────────────────────
// 진입점
// ─────────────────────────────────────────────
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 세로 고정
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // AdMob 초기화 + 첫 광고 미리 로드
  await MobileAds.instance.initialize();
  InterstitialService.instance.loadAd();

  runApp(const MiniGamesApp());
}

// ─────────────────────────────────────────────
// 앱 루트
// ─────────────────────────────────────────────
class MiniGamesApp extends StatelessWidget {
  const MiniGamesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '도전! 미니게임',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF6B9D),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
    );
  }
}

// ─────────────────────────────────────────────
// 메인 WebView 화면
// ─────────────────────────────────────────────
class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;

  bool _isLoading = true;
  bool _hasError  = false;

  // 광고 타이머: 앱 실행 후 _adIntervalMin 분마다 전면 광고 1회
  static const _adIntervalMin = 4;
  Timer? _adTimer;

  // 웹앱 URL
  static const _webUrl = 'https://game.luckygrampus.com';

  // ── 초기화 ─────────────────────────────────
  @override
  void initState() {
    super.initState();
    _initController();
    _startAdTimer();
  }

  void _initController() {
    _controller = WebViewController()

      // JavaScript 전체 허용 (게임 필수)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)

      // 배경색을 웹앱과 동일하게 (로딩 중 흰 번쩍임 방지)
      ..setBackgroundColor(Colors.black)

      // 네비게이션 이벤트 처리
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) {
          if (mounted) setState(() { _isLoading = true; _hasError = false; });
        },
        onPageFinished: (_) {
          if (mounted) setState(() => _isLoading = false);
        },
        onWebResourceError: (err) {
          // 메인 프레임 에러만 처리 (서브리소스 오류 무시)
          if (err.isForMainFrame ?? true) {
            if (mounted) setState(() { _isLoading = false; _hasError = true; });
          }
        },
        onNavigationRequest: (req) {
          // 게임 서비스 도메인 + 인증 관련 도메인은 WebView 내부 처리
          final host = Uri.tryParse(req.url)?.host ?? '';
          const allowedHosts = [
            'luckygrampus.com',
            'game.luckygrampus.com',
            'accounts.google.com',
            'firebaseapp.com',
            'firebase.google.com',
            'kakao.com',
            'kauth.kakao.com',
          ];
          if (allowedHosts.any((h) => host.contains(h))) {
            return NavigationDecision.navigate;
          }
          // 그 외 외부 링크도 일단 허용 (필요 시 시스템 브라우저 분기 가능)
          return NavigationDecision.navigate;
        },
      ))

      // ── JS 브리지: 웹앱 → Flutter 광고 요청 ──────────
      // 웹앱에서 window.AdBridge.postMessage('showAd') 호출 시 전면 광고 표시
      ..addJavaScriptChannel(
        'AdBridge',
        onMessageReceived: (msg) {
          if (msg.message == 'showAd') _showAd();
        },
      )

      ..loadRequest(Uri.parse(_webUrl));
  }

  // ── 타이머 광고 ────────────────────────────
  void _startAdTimer() {
    _adTimer = Timer.periodic(
      Duration(minutes: _adIntervalMin),
      (_) => _showAd(),
    );
  }

  void _showAd() => InterstitialService.instance.showAd();

  @override
  void dispose() {
    _adTimer?.cancel();
    super.dispose();
  }

  // ── 뒤로 가기 처리 ─────────────────────────
  Future<void> _handlePop() async {
    if (await _controller.canGoBack()) {
      _controller.goBack();
    }
    // 웹 히스토리 없으면 앱 종료 (OS 기본 동작에 위임)
  }

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return PopScope(
      // 뒤로가기를 Flutter가 가로채 웹 히스토리 처리
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _handlePop();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [

              // ── 웹뷰 본체 ─────────────────
              WebViewWidget(controller: _controller),

              // ── 로딩 스피너 ───────────────
              if (_isLoading)
                const Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF39FF14), // 네온 그린
                    strokeWidth: 3,
                  ),
                ),

              // ── 에러 화면 ─────────────────
              if (_hasError && !_isLoading)
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, color: Colors.white38, size: 64),
                      const SizedBox(height: 16),
                      const Text(
                        '네트워크 연결을 확인해주세요',
                        style: TextStyle(color: Colors.white60, fontSize: 16),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => _controller.reload(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF39FF14),
                          foregroundColor: Colors.black,
                        ),
                        child: const Text('다시 시도'),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
