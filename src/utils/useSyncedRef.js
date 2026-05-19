import { useRef, useEffect } from 'react';

/**
 * useState 값을 ref에 동기화. 게임 루프처럼 클로저가 stale state를 읽어야 할 때 사용.
 */
export function useSyncedRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}
