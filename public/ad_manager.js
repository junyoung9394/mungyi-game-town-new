/**
 * 뭉이 게임타운 - 광고 관리자 v3 (깔끔 버전)
 *
 * 정책:
 * 1. 사이트(index.html) 하단 배너 1개
 * 2. 게임 종료/홈가기 시 전면광고 1회
 * 3. 게임 졌을 때 리워드 광고 (선택형: 보고 계속하기)
 * 4. 게임 중 광고 없음
 */

const AdManager = {
  PUB: 'ca-pub-8518556382646891',
  SLOTS: {
    banner:      '8080905265',   // 하단 배너
    interstitial:'8441385073',   // 전면 광고
    reward:      '5445109426',   // 리워드 광고
  },

  _exitAdShown: false,   // 이번 세션 전면광고 표시 여부
  _initialized: false,

  // ── 초기화 (index.html에서만 배너 표시) ──
  init(showBanner) {
    if (this._initialized) return;
    this._initialized = true;

    // 애드센스 스크립트 로드
    if (!document.querySelector('script[data-adsense]')) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + this.PUB;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-adsense', '1');
      s.onerror = () => {};
      document.head.appendChild(s);
    }

    if (showBanner) this._showBanner();
  },

  // ── 하단 배너 (index.html 전용) ──
  _showBanner() {
    if (document.getElementById('ad-bottom-banner')) return;

    const wrap = document.createElement('div');
    wrap.id = 'ad-bottom-banner';
    wrap.style.cssText = [
      'width:100%',
      'background:rgba(0,0,0,0.7)',
      'text-align:center',
      'padding:4px 0 2px',
      'border-top:1px solid rgba(255,255,255,0.06)',
      'position:relative',
      'z-index:10',
    ].join(';');

    wrap.innerHTML =
      '<div style="font-size:8px;color:rgba(255,255,255,0.2);font-family:sans-serif;margin-bottom:2px;">AD</div>' +
      '<ins class="adsbygoogle"' +
        ' style="display:block;min-height:50px;"' +
        ' data-ad-client="' + this.PUB + '"' +
        ' data-ad-slot="' + this.SLOTS.banner + '"' +
        ' data-ad-format="auto"' +
        ' data-full-width-responsive="true"></ins>';

    // 하단 네비게이션 위에 삽입
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      bottomNav.parentNode.insertBefore(wrap, bottomNav);
    } else {
      document.querySelector('.app')?.appendChild(wrap);
    }

    setTimeout(() => {
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
    }, 500);
  },

  // ── 전면광고 (홈가기/게임종료 시 1회) ──
  showExitAd(callback) {
    // 이미 이번 세션에 보여줬으면 바로 콜백
    if (this._exitAdShown) {
      if (callback) callback();
      return;
    }

    this._exitAdShown = true;

    const overlay = document.createElement('div');
    overlay.id = 'ad-exit';
    overlay.style.cssText = [
      'position:fixed', 'inset:0',
      'background:rgba(0,0,0,0.94)',
      'z-index:99999',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:sans-serif',
    ].join(';');

    overlay.innerHTML =
      '<div style="' +
        'background:#1a1a2e;' +
        'border:1px solid rgba(255,255,255,0.12);' +
        'border-radius:20px;padding:20px;' +
        'text-align:center;width:92%;max-width:340px;' +
      '">' +
        '<div style="font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:10px;letter-spacing:1px;">ADVERTISEMENT</div>' +
        '<ins class="adsbygoogle"' +
          ' style="display:block;min-height:250px;width:100%;"' +
          ' data-ad-client="' + this.PUB + '"' +
          ' data-ad-slot="' + this.SLOTS.interstitial + '"' +
          ' data-ad-layout="in-article"' +
          ' data-ad-format="fluid"></ins>' +
        '<div style="margin-top:14px;">' +
          '<button id="ad-exit-btn"' +
            ' style="' +
              'background:linear-gradient(135deg,#FF6B9D,#FF9F43);' +
              'color:white;border:none;border-radius:14px;' +
              'padding:12px;width:100%;' +
              'font-size:13px;font-weight:800;' +
              'cursor:pointer;opacity:0.35;' +
            '" disabled>' +
            '잠시만요... (<span id="ad-exit-sec">5</span>초)' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}

    const btn = overlay.querySelector('#ad-exit-btn');
    const secEl = overlay.querySelector('#ad-exit-sec');
    let sec = 5;
    const t = setInterval(() => {
      sec--;
      if (secEl) secEl.textContent = sec;
      if (sec <= 0) {
        clearInterval(t);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = '✕ 닫기';
      }
    }, 1000);

    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      overlay.remove();
      if (callback) callback();
    });
  },

  // ── 리워드 광고 (게임 졌을 때 "광고 보고 계속하기") ──
  showReward(onRewarded, onSkipped) {
    const overlay = document.createElement('div');
    overlay.id = 'ad-reward';
    overlay.style.cssText = [
      'position:fixed', 'inset:0',
      'background:rgba(0,0,0,0.94)',
      'z-index:99999',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:sans-serif',
    ].join(';');

    overlay.innerHTML =
      '<div style="' +
        'background:#1a1a2e;' +
        'border:2px solid #FF6B9D;' +
        'border-radius:20px;padding:20px;' +
        'text-align:center;width:92%;max-width:340px;' +
        'box-shadow:0 0 30px rgba(255,107,157,0.3);' +
      '">' +
        '<div style="font-size:36px;margin-bottom:8px;">🎁</div>' +
        '<div style="font-family:sans-serif;font-size:15px;font-weight:800;color:white;margin-bottom:6px;">계속하시겠어요?</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:14px;line-height:1.6;">' +
          '짧은 광고를 보고<br>계속 플레이하세요! 🎮' +
        '</div>' +
        '<ins class="adsbygoogle"' +
          ' style="display:block;min-height:200px;width:100%;margin-bottom:14px;"' +
          ' data-ad-client="' + this.PUB + '"' +
          ' data-ad-slot="' + this.SLOTS.reward + '"' +
          ' data-ad-layout="in-article"' +
          ' data-ad-format="fluid"></ins>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
          '<button id="ad-reward-skip" style="' +
            'background:rgba(255,255,255,0.08);' +
            'border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:12px;padding:12px;' +
            'color:rgba(255,255,255,0.5);' +
            'font-size:12px;cursor:pointer;' +
          '">그냥 종료</button>' +
          '<button id="ad-reward-btn" style="' +
            'background:linear-gradient(135deg,#FF6B9D,#FF9F43);' +
            'color:white;border:none;border-radius:12px;' +
            'padding:12px;font-size:12px;font-weight:800;' +
            'cursor:pointer;opacity:0.35;' +
          '" disabled>계속하기 (<span id="ad-reward-sec">5</span>초)</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}

    const rewardBtn = overlay.querySelector('#ad-reward-btn');
    const skipBtn  = overlay.querySelector('#ad-reward-skip');
    const secEl    = overlay.querySelector('#ad-reward-sec');
    let sec = 5;

    const t = setInterval(() => {
      sec--;
      if (secEl) secEl.textContent = sec;
      if (sec <= 0) {
        clearInterval(t);
        rewardBtn.disabled = false;
        rewardBtn.style.opacity = '1';
        rewardBtn.textContent = '✅ 계속하기!';
      }
    }, 1000);

    rewardBtn.addEventListener('click', () => {
      if (rewardBtn.disabled) return;
      overlay.remove();
      if (onRewarded) onRewarded();
    });

    skipBtn.addEventListener('click', () => {
      clearInterval(t);
      overlay.remove();
      if (onSkipped) onSkipped();
    });
  },

  // ── 홈 버튼 래핑 (전면광고 후 이동) ──
  wrapHomeBtn() {
    const homeBtn = document.getElementById('home-fab');
    if (!homeBtn) return;
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.showExitAd(() => {
        window.location.href = 'index.html';
      });
    });
  },
};

// 자동 초기화
(function() {
  const isIndex = window.location.pathname.endsWith('index.html') ||
                  window.location.pathname === '/' ||
                  window.location.pathname.endsWith('/');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      AdManager.init(isIndex);
      AdManager.wrapHomeBtn();
    });
  } else {
    AdManager.init(isIndex);
    AdManager.wrapHomeBtn();
  }
})();
