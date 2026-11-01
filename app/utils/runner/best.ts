const BEST_KEY = 'runner-best';

export function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const value = raw === null ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  catch {
    return 0;
  }
}

export function writeBest(value: number) {
  localStorage.setItem(BEST_KEY, String(value));
}