// localStorage access, always guarded: the site must work without storage.

const PREFIX = 'pfg:';

export function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function set(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable or full: ignore */
  }
}

export interface ChapterState {
  /** Last scroll position as a fraction of the page, 0..1. */
  pos: number;
  /** Furthest position reached, 0..1. */
  read: number;
}

export const chapterState = (book: string, key: string): ChapterState => get<ChapterState>(`ch:${book}/${key}`, { pos: 0, read: 0 });
export const saveChapterState = (book: string, key: string, s: ChapterState) => set(`ch:${book}/${key}`, s);
export const lastChapter = (): { book: string; key: string } | null => {
  const v = get<{ book: string; key: string } | null>('last', null);
  return v && typeof v === 'object' && typeof v.book === 'string' ? v : null;
};
export const setLastChapter = (book: string, key: string) => set('last', { book, key });

export type Theme = 'system' | 'light' | 'dark';
export const theme = (): Theme => {
  try {
    const t = localStorage.getItem(PREFIX + 'theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
};
export const setTheme = (t: Theme) => {
  try {
    if (t === 'system') localStorage.removeItem(PREFIX + 'theme');
    else localStorage.setItem(PREFIX + 'theme', t);
  } catch {
    /* ignore */
  }
};
