import type { Card, Settings, StorageAdapter, PracticeSession, PracticeItem, PracticeStatus } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

const CARDS_KEY = 'tou-de-ban-ju:cards:v1'
const SETTINGS_KEY = 'tou-de-ban-ju:settings:v1'
const SESSIONS_KEY = 'tou-de-ban-ju:practice-sessions:v1'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parsePracticeStats(x: unknown): Card['practiceStats'] {
  if (!x || typeof x !== 'object') return undefined
  const o = x as Record<string, unknown>
  const recalled = Number(o.recalled ?? 0)
  const hinted = Number(o.hinted ?? 0)
  const cant = Number(o.cant ?? 0)
  const lastAt = typeof o.lastAt === 'number' ? o.lastAt : undefined
  let lastStatus: 'recalled' | 'hinted' | 'cant' | undefined
  if (o.lastStatus === 'recalled' || o.lastStatus === 'hinted' || o.lastStatus === 'cant') {
    lastStatus = o.lastStatus
  }
  // 全 0 且没 lastAt 就当不存在，UI 那边就不会展示
  if (recalled === 0 && hinted === 0 && cant === 0 && !lastAt) return undefined
  return { recalled, hinted, cant, lastStatus, lastAt }
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
        // 练一句字段（可选）
        recallHint: typeof x.recallHint === 'string' && x.recallHint.trim() ? x.recallHint : undefined,
        oralQuestion: typeof x.oralQuestion === 'string' && x.oralQuestion.trim() ? x.oralQuestion : undefined,
        practiceStats: parsePracticeStats(x.practiceStats),
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

  // ---------- 练习会话 ----------

  listPracticeSessions(): PracticeSession[] {
    const raw = safeParse<unknown[]>(localStorage.getItem(SESSIONS_KEY), [])
    if (!Array.isArray(raw)) return []
    return raw
      .filter((s) => s && typeof s === 'object')
      .map((s) => {
        const o = s as Record<string, unknown>
        const items = Array.isArray(o.items)
          ? o.items
              .filter((i) => i && typeof i === 'object')
              .map((i) => {
                const x = i as Record<string, unknown>
                return {
                  cardId: String(x.cardId ?? ''),
                  status: (x.status === 'recalled' || x.status === 'hinted' || x.status === 'cant') ? x.status : 'cant',
                  selfText: typeof x.selfText === 'string' ? x.selfText : undefined,
                  at: Number(x.at ?? 0),
                } as PracticeItem
              })
          : []
        return {
          date: String(o.date ?? ''),
          startedAt: Number(o.startedAt ?? 0),
          finishedAt: typeof o.finishedAt === 'number' ? o.finishedAt : undefined,
          items,
        } as PracticeSession
      })
      .filter((s) => s.date)
  }

  appendPracticeSessionItem(date: string, item: PracticeItem): void {
    const all = this.listPracticeSessions()
    let s = all.find((x) => x.date === date)
    if (!s) {
      s = { date, startedAt: item.at, items: [] }
      all.push(s)
    }
    s.items.push(item)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all))
  }

  bumpPracticeStats(cardId: string, status: PracticeStatus, at: number): void {
    const all = this.listCards()
    const idx = all.findIndex((c) => c.id === cardId)
    if (idx === -1) return
    const c = all[idx]
    const prev = c.practiceStats || { recalled: 0, hinted: 0, cant: 0 }
    const next = {
      recalled: prev.recalled + (status === 'recalled' ? 1 : 0),
      hinted: prev.hinted + (status === 'hinted' ? 1 : 0),
      cant: prev.cant + (status === 'cant' ? 1 : 0),
      lastStatus: status,
      lastAt: at,
    }
    all[idx] = { ...c, practiceStats: next, lastPracticedAt: at, updatedAt: at }
    localStorage.setItem(CARDS_KEY, JSON.stringify(all))
  }
}

// 单例：UI 层直接用这一个
export const storage: StorageAdapter = new LocalStorageAdapter()

// 工具：今天日期字符串（YYYY-MM-DD），UI 也要用，导出避免重复实现
export function todayKey(): string {
  return todayStr()
}
