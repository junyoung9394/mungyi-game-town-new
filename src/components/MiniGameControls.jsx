export default function MiniGameControls({ controls, hint }) {
  return (
    <div className="mini-controls">
      <div role="group" aria-label="게임 조작">
        {controls.map(({ label, symbol, action }) => <button key={label} aria-label={label} onClick={action}>{symbol}<span>{label}</span></button>)}
      </div>
      {hint && <p>{hint}</p>}
    </div>
  );
}
