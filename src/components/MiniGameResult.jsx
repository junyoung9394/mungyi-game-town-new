import KakaoShareButton from './KakaoShareButton';

export default function MiniGameResult({ gameId, score, best = 0, isNewHi = false, title = '한 판 완료!', detail, showScore = true, onRetry, onExit }) {
  return (
    <div className="mini-result" role="region" aria-label="게임 결과">
      <div className="mini-result-card">
        <span className="mini-result-kicker">{isNewHi ? '✦ NEW BEST' : 'NICE PLAY'}</span>
        <h2>{title}</h2>
        {showScore && <><p className="mini-result-score"><strong>{score.toLocaleString()}</strong><span>이번 기록</span></p>
        <p className="mini-result-best">최고 기록 <strong>{Math.max(best, score).toLocaleString()}</strong></p></>}
        {detail && <p className="mini-result-detail">{detail}</p>}
        <button className="mini-primary" onClick={onRetry}>↻ 한 판 더</button>
        <button className="mini-secondary" onClick={() => onExit?.(score)}>다른 게임 고르기 →</button>
        {showScore && <KakaoShareButton gameId={gameId} score={score} />}
      </div>
    </div>
  );
}
