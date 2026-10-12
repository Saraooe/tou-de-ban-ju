import type { Card, Settings, StorageAdapter } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const CARDS_KEY = 'tou-de-ban-ju:cards:v1'
const SETTINGS_KEY = 'tou-de-ban-ju:settings:v1'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  listCards(): Card[] {
    const raw = safeParse<unknown[]>(localStorage.getItem(CARDS_KEY), [])
    // 兜底：老数据缺字段时填默认值，避免 undefined 串到 UI
    return raw.map((c) => {
      const x = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>
      return {
        id: String(x.id ?? ''),
        original: String(x.original ?? ''),
        sourceLink: typeof x.sourceLink === 'string' ? x.sourceLink : undefined,
        topic: String(x.topic ?? ''),
        meaning: typeof x.meaning === 'string' ? x.meaning : '',
        skeleton: String(x.skeleton ?? ''),
        scenarios: Array.isArray(x.scenarios) ? x.scenarios.map((s) => String(s)) : [],
        tone: String(x.tone ?? ''),
        avoid: String(x.avoid ?? ''),
        examples: Array.isArray(x.examples) ? x.examples.map((s) => String(s)) : [],
        sourceContext: typeof x.sourceContext === 'string' && x.sourceContext.trim() ? x.sourceContext : undefined,
        suggestedTopics: Array.isArray(x.suggestedTopics) ? x.suggestedTopics.map((s) => String(s)) : undefined,
        usages: Array.isArray(x.usages)
          ? x.usages
              .filter((u) => u && typeof u === 'object')
              .map((u) => ({ text: String((u as Record<string, unknown>).text ?? ''), at: Number((u as Record<string, unknown>).at ?? 0) }))
          : undefined,
        useCount: Number(x.useCount ?? 0),
        lastPracticedAt: typeof x.lastPracticedAt === 'number' ? x.lastPracticedAt : undefined,
        createdAt: Number(x.createdAt ?? 0),
        updatedAt: Number(x.updatedAt ?? 0),
      }
    })
  }

  getCard(id: string): Card | null {
    return this.listCards().find((c) => c.id === id) ?? null
  }

  saveCard(card: Card): void {
    const all = this.listCards()
    const idx = all.findIndex((c) => c.id === card.id)
    const next = { ...card, updatedAt: Date.now() }
    if (idx === -1) all.push(next)
    else all[idx] = next
    localStorage.setItem(CARDS_KEY, JSON.stringify(all))
  }

  deleteCard(id: string): void {
    const all = this.listCards().filter((c) => c.id !== id)
    localStorage.setItem(CARDS_KEY, JSON.stringify(all))
  }

  replaceAllCards(cards: Card[]): void {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
  }

  getSettings(): Settings {
    return safeParse<Settings>(localStorage.getItem(SETTINGS_KEY), DEFAULT_SETTINGS)
  }

  saveSettings(s: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  }
}

// 单例：UI 层直接用这一个
export const storage: StorageAdapter = new LocalStorageAdapter()
