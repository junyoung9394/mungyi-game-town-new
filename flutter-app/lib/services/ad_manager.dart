// lib/services/ad_manager.dart
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

// ─────────────────────────────────────────────
// 광고 단위 ID (실제 AdMob ID)
// ─────────────────────────────────────────────
class AdManager {
  static const String appId              = 'ca-app-pub-8518556382646891~2852387790';
  static const String interstitialUnitId = 'ca-app-pub-8518556382646891/9717179041';
  static const String bannerUnitId       = 'ca-app-pub-8518556382646891/1423283299';
}

// ─────────────────────────────────────────────
// 전면(인터스티셜) 광고 서비스
// ─────────────────────────────────────────────
class InterstitialService {
  InterstitialService._();
  static final instance = InterstitialService._();

  InterstitialAd? _ad;
  bool _isShowing = false;

  bool get isLoaded => _ad != null;

  void loadAd() {
    InterstitialAd.load(
      adUnitId: AdManager.interstitialUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          debugPrint('[Ad] 전면 광고 로드 완료');
          _ad = ad;
        },
        onAdFailedToLoad: (err) {
          debugPrint('[Ad] 전면 광고 로드 실패: ${err.message}');
          _ad = null;
          // 30초 후 재시도
          Future.delayed(const Duration(seconds: 30), loadAd);
        },
      ),
    );
  }

  void showAd({VoidCallback? onDismiss}) {
    // 이미 표시 중이거나 로드되지 않은 경우
    if (_isShowing || _ad == null) {
      onDismiss?.call();
      return;
    }

    _isShowing = true;
    _ad!
      ..fullScreenContentCallback = FullScreenContentCallback(
        onAdShowedFullScreenContent: (_) {
          debugPrint('[Ad] 전면 광고 표시됨');
        },
        onAdDismissedFullScreenContent: (ad) {
          debugPrint('[Ad] 전면 광고 닫힘 → 다음 광고 로드');
          ad.dispose();
          _ad = null;
          _isShowing = false;
          loadAd();          // 다음 광고 미리 로드
          onDismiss?.call();
        },
        onAdFailedToShowFullScreenContent: (ad, err) {
          debugPrint('[Ad] 전면 광고 표시 실패: ${err.message}');
          ad.dispose();
          _ad = null;
          _isShowing = false;
          loadAd();
          onDismiss?.call();
        },
      )
      ..show();
  }
}
