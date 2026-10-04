const GAMES = [
  ['↗', '러너', 'pink'], ['▦', '테트리스', 'purple'], ['⌁', '스네이크', 'mint'],
];

function ArcadeArt() {
  return (
    <div className="arcade-art" aria-hidden="true">
      <span className="arcade-star star-one">✦</span>
      <span className="arcade-star star-two">✧</span>
      <span className="arcade-orbit">+ HIGH SCORE</span>
      <div className="arcade-machine">
        <div className="arcade-marquee">MUNGYI <span>★</span> ARCADE</div>
        <div className="arcade-display">
          <span className="arcade-display-label">PLAYER 01</span>
          <svg viewBox="0 0 16 14" className="arcade-mascot">
            <path fill="currentColor" d="M4 1h8v1h2v2h1v9h-3v-2h-2v2H6v-2H4v2H1V4h1V2h2z" />
            <path fill="#17132b" d="M4 5h2v3H4zm6 0h2v3h-2zM6 9h4v1H6z" />
          </svg>
          <span className="arcade-ready">READY TO PLAY?</span>
          <div className="arcade-pixels">▪ ▪ ▪ ▪ ▪ ▪ ▪</div>
        </div>
        <div className="arcade-controls"><i /><span /><span /></div>
        <div className="arcade-base"><span>INSERT FUN</span><i /></div>
      </div>
      <span className="arcade-token">✦</span>
    </div>
  );
}

export default function LoginScreen({ loading, onGoogle, onKakao, onGuest }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-story">
        <span className="welcome-eyebrow"><i /> YOUR LITTLE ARCADE</span>
        <h2>잠깐의 틈,<br /><span>신나는 한 판.</span></h2>
        <p className="welcome-description">가볍게 시작하고, 나만의 기록을 만들어 보세요.<br />무명이의 작은 게임 타운에 오신 걸 환영해요.</p>
        <ArcadeArt />
        <div className="welcome-games" aria-label="플레이할 수 있는 게임 미리보기">
          {GAMES.map(([icon, name, color]) => (
            <div className={`welcome-game ${color}`} key={name}><span aria-hidden="true">{icon}</span><strong>{name}</strong></div>
          ))}
          <span className="welcome-more">+3 게임</span>
        </div>
      </div>
      <div className="welcome-entry">
        <div className="welcome-entry-top"><span>LET’S PLAY</span><span>01 / START</span></div>
        <div className="welcome-entry-title"><span aria-hidden="true">✳</span><h3>오늘은 어떤 기록을<br />만들어 볼까요?</h3></div>
        <p className="welcome-entry-description">편한 방법으로 게임 타운에 입장하세요.</p>
        <div className="welcome-actions" aria-busy={loading}>
          <button className="welcome-button welcome-guest" onClick={onGuest} disabled={loading}>
            <span aria-hidden="true">▷</span><span>게스트로 시작하기</span><span aria-hidden="true">↗</span>
          </button>
          <p className="welcome-hint">계정 선택 없이 가볍게 시작해요</p>
          <div className="welcome-divider"><span>계정으로 계속하기</span></div>
          <button className="welcome-button welcome-kakao" onClick={onKakao} disabled={loading}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.5 5.1 3.9 6.5L5.1 21l4.2-2.4c.8.2 1.7.4 2.7.4 5.5 0 10-3.5 10-8S17.5 3 12 3z" /></svg>
            <span>카카오로 시작하기</span><span aria-hidden="true">→</span>
          </button>
          <button className="welcome-button welcome-google" onClick={onGoogle} disabled={loading}>
            <span className="google-mark" aria-hidden="true">G</span><span>구글로 시작하기</span><span aria-hidden="true">→</span>
          </button>
          {loading && <p className="welcome-status" role="status">입장 준비 중입니다. 로그인 팝업이 열렸다면 확인해 주세요.</p>}
        </div>
        <div className="welcome-footer"><span aria-hidden="true">✦</span> 작지만 확실한 즐거움, 한 판이면 충분해요.</div>
      </div>
    </div>
  );
}
