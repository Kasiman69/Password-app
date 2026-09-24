export const LOCK_DELAY_MS = 5 * 60 * 1000;

// Check elapsed time on return, even when iOS has suspended all timers.
export function createAutoLock(lock: () => void, now = Date.now) {
  let lastActivity = now();
  let awaySince: number | null = null;
  let expired = false;
  function check() {
    if (!expired && now() - (awaySince ?? lastActivity) >= LOCK_DELAY_MS) {
      expired = true;
      lock();
      return true;
    }
    return false;
  }
  return {
    check,
    reset() { lastActivity = now(); awaySince = null; expired = false; },
    activity() {
      const justLocked = check();
      if (awaySince === null && !expired) lastActivity = now();
      return justLocked;
    },
    leave() {
      check();
      if (awaySince === null) awaySince = now();
    },
    resume() {
      check();
      if (awaySince !== null) {
        awaySince = null;
        lastActivity = now();
      }
    },
  };
}
