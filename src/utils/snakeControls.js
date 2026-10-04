// Accept one turn per simulation tick, so rapid inputs cannot reverse into the body.
export function queueSnakeTurn(current, queued, next) {
  if (queued || !next) return queued;
  if (next.dx === current.dx && next.dy === current.dy) return null;
  if (next.dx === -current.dx && next.dy === -current.dy) return null;
  return next;
}

export function swipeDirection(dx, dy, threshold = 15) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) <= threshold) return null;
  return Math.abs(dx) > Math.abs(dy)
    ? { dx: Math.sign(dx), dy: 0 }
    : { dx: 0, dy: Math.sign(dy) };
}
