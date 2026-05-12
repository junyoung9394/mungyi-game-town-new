import React from 'react';

const GAME_NAMES = {
  flappy:       'FLAPPY 무명이',
  snake:        'NEON SNAKE',
  tetris:       'CLASSIC TETRIS',
  brickBreaker: 'NEON BRICKS',
  dustInvader:  'DUST INVADER',
};

export default function KakaoShareButton({ gameId, score, size = 'md' }) {
  const handleShare = () => {
    const Kakao = window.Kakao;
    if (!Kakao?.isInitialized?.()) {
      /* 미로그인·SDK 미로드 시 → 웹 공유 fallback */
      const text = `나 방금 '무명이 게임 타운'에서 ${score.toLocaleString()}점 찍음! 너도 나 이길 수 있어? 🔥\nhttps://game.luckygrampus.com`;
      if (navigator.share) {
        navigator.share({ title: '무명이 게임 타운', text, url: 'https://game.luckygrampus.com' })
          .catch(() => {});
      } else {
        navigator.clipboard?.writeText(text);
        alert('링크가 복사됐어요! 친구에게 붙여넣기 해주세요.');
      }
      return;
    }

    const gameName = GAME_NAMES[gameId] || '무명이 게임 타운';

    try {
      Kakao.Link.sendDefault({
        objectType: 'feed',
        content: {
          title: `${gameName} — ${score.toLocaleString()}점 달성! 🏆`,
          description: `나 방금 '무명이 게임 타운'에서 ${score.toLocaleString()}점 찍음!\n너도 나 이길 수 있어? 🔥`,
          imageUrl: 'https://game.luckygrampus.com/logo.png',
          link: {
            mobileWebUrl: 'https://game.luckygrampus.com',
            webUrl:       'https://game.luckygrampus.com',
          },
        },
        buttons: [
          {
            title: '🎮 게임하러 가기',
            link: {
              mobileWebUrl: 'https://game.luckygrampus.com',
              webUrl:       'https://game.luckygrampus.com',
            },
          },
        ],
      });
    } catch (e) {
      console.error('[KakaoShare] 공유 실패:', e);
      alert('카카오 공유에 실패했습니다: ' + e.message);
    }
  };

  const px  = size === 'sm' ? 'px-3 py-2.5' : 'px-4 py-3';
  const txt = size === 'sm' ? 'text-[9px]'  : 'text-[11px]';

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 ${px} ${txt} tracking-wider active:scale-95 transition-all shrink-0`}
      style={{
        fontFamily:  '"Press Start 2P",monospace',
        background:  '#FEE500',
        color:       '#3C1E1E',
        border:      '2px solid #FDDC3F',
        boxShadow:   '0 0 10px rgba(254,229,0,0.45)',
      }}
      title="카카오톡으로 점수 공유하기"
    >
      {/* 카카오 말풍선 아이콘 */}
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="#3C1E1E">
        <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.55 5.07 3.9 6.51L5.1 21l4.18-2.43C10.06 18.84 11.02 19 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z"/>
      </svg>
      공유
    </button>
  );
}
