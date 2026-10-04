import test from 'node:test';
import assert from 'node:assert/strict';
import { queueSnakeTurn, swipeDirection } from '../src/utils/snakeControls.js';

const right = { dx: 1, dy: 0 };
const up = { dx: 0, dy: -1 };
const left = { dx: -1, dy: 0 };

test('a rapid second turn cannot reverse the snake before its next tick', () => {
  const first = queueSnakeTurn(right, null, up);
  assert.deepEqual(first, up);
  assert.deepEqual(queueSnakeTurn(right, first, left), up);
});
test('reverse input is ignored but a legal perpendicular turn is accepted', () => {
  assert.equal(queueSnakeTurn(right, null, left), null);
  assert.deepEqual(queueSnakeTurn(right, null, up), up);
  assert.equal(queueSnakeTurn(right, null, right), null);
});
test('small finger movements never turn the snake', () => {
  assert.equal(swipeDirection(9, 2), null);
  assert.equal(swipeDirection(-15, 4), null);
  assert.equal(swipeDirection(0, 0), null);
});
test('swipes follow the dominant axis in all four directions', () => {
  assert.deepEqual(swipeDirection(40, 4), right);
  assert.deepEqual(swipeDirection(-40, 4), left);
  assert.deepEqual(swipeDirection(4, -40), up);
  assert.deepEqual(swipeDirection(4, 40), { dx: 0, dy: 1 });
});
