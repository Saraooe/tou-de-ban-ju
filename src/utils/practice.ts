import type { Card, PracticeSession, PracticeStatus } from '@/types'

/** 把毫秒时间戳格式化成 YYYY-MM-DD（按本机时区） */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 旧卡没有 recallHint 时，用现有字段拼一句像样的中文回忆提示 */
export function fallbackRecallHint(card: Card): string {
  if (card.meaning?.trim()) return `想表达：「${card.meaning.trim()}」`
  if (card.topic?.trim()) return `主题：${card.topic.trim()}`
  return '把这句用在自己的一个场景里'
}

/** 旧卡没有 oralQuestion 时，用现有场景拼一个英文口语问题 */
export function fallbackOralQuestion(card: Card): string {
  if (card.scenarios?.[0]?.trim()) {
    return `When you ${card.scenarios[0].toLowerCase()}, what would you say?`
  }
  return 'Say something using this expression in your own words.'
}

/** 优先级算分：说不出的最优先，已会的最末。返回值越大越靠前。 */
function score(card: Card): number {
  const ps = card.practiceStats
  const need = (ps?.cant ?? 0) * 3 + (ps?.hinted ?? 0) * 1.5 - (ps?.recalled ?? 0) * 0.5
  // 距上次练习越久越优先（最多 7 天权重）
  let recency = 7
  if (ps?.lastAt) {
    const days = (Date.now() - ps.lastAt) / 86400000
    recency = Math.min(days, 7)
  }
  return need + recency * 0.3
}

/**
 * 选 N 张今天要练的卡片。
 * - 跳过今天已经练过的（同一 cardId）
 * - 没说过的（新卡）也排得靠前
 * - 候选不够时拿真实可用的，不补 dummy
 */
export function pickPracticeQueue(
  cards: Card[],
  sessions: PracticeSession[],
  today: string,
  count = 3,
): Card[] {
  // 今日已练过的 cardId
  const todays = new Set<string>()
  for (const s of sessions) {
    if (s.date !== today) continue
    for (const it of s.items) todays.add(it.cardId)
  }
  const pool = cards.filter((c) => c.original.trim() && !todays.has(c.id))
  if (pool.length === 0) return []

  const sorted = [...pool].sort((a, b) => {
    const diff = score(b) - score(a)
    if (diff !== 0) return diff
    // 同样分数时随机打散，避免每次都是同一组
    return Math.random() - 0.5
  })
  return sorted.slice(0, count)
}

/** 总结页用：按"待提升"程度排序，recalled 排后面 */
export function rankForReview(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => score(b) - score(a))
}

/** 状态中文显示（grug 风短文案） */
export const PRACTICE_STATUS_LABEL: Record<PracticeStatus, string> = {
  recalled: '主动想起',
  hinted: '靠提示',
  cant: '还说不出',
}

/** 状态对应的小表情（grug 风的手绘无色图标用不上，文本就够了） */
export const PRACTICE_STATUS_DESC: Record<PracticeStatus, string> = {
  recalled: '没看答案自己说出来的',
  hinted: '看了提示 / 看了原句才想起来的',
  cant: '现在还说不出来',
}
