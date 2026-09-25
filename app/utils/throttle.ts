export function throttle(func: Function, limit: number = 0) {
  let inThrottle = false;
  return function(...args: unknown[]) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}