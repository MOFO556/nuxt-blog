export function debounce(func: Function, timeout: number = 0) {
  let timeoutId: NodeJS.Timeout | undefined;
  return (...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}