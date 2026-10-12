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
    return safeParse<Card[]>(localStorage.getItem(CARDS_KEY), [])
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

  getSettings(): Settings {
    return safeParse<Settings>(localStorage.getItem(SETTINGS_KEY), DEFAULT_SETTINGS)
  }

  saveSettings(s: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  }
}

// 单例：UI 层直接用这一个
export const storage: StorageAdapter = new LocalStorageAdapter()
