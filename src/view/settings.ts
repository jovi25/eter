// Player options (sound / vibration / screen shake). Per-device, stored in localStorage.

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  shake: boolean;
  economy: 'auto' | 'on' | 'off'; // Modo econômico (src/view/perf.ts)
}

const KEY = 'eter.settings.v1';
const DEFAULTS: Settings = { sound: true, music: true, vibration: true, shake: true, economy: 'auto' };

let current: Settings = load();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* storage blocked or corrupt: use defaults */
  }
  return { ...DEFAULTS };
}

export function getSettings(): Readonly<Settings> {
  return current;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  current = { ...current, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[]): void {
  if (!current.vibration) return;
  try {
    // Browsers refuse (and log an error) before the first tap on the page.
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported (iOS) */
  }
}
