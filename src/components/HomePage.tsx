import { useEffect, useMemo, useState } from 'react'
import type { Card } from '@/types'
import { HandCheck } from './hand/HandCheck'
import { IconArrowUp, IconFlower, IconTree, IconSun } from './hand/HandIcon'

/** 把时间戳格式化成 grug 风的短日期：10.12 */
function fmtDay(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

/** 句型骨架渲染：___ 变成手绘下划线填空 */
export function SkeletonInline({ text }: { text: string }) {
  const parts = text.split('___')
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="skeleton-mark">&nbsp;&nbsp;&nbsp;&nbsp;</span>}
        </span>
      ))}
    </>
  )
}

/** 挑今天要练的一句：练得最少、放得最久的优先 */
function pickToday(cards: Card[]): Card | null {
  if (cards.length === 0) return null
  const sorted = [...cards].sort(
    (a, b) =>
      a.useCount - b.useCount ||
      (a.lastPracticedAt ?? 0) - (b.lastPracticedAt ?? 0) ||
      a.createdAt - b.createdAt,
  )
  return sorted[0]
}

/** 找某一天练过的最近一张卡片 */
function cardPracticedOn(cards: Card[], dayStart: number): Card | null {
  const dayEnd = dayStart + 24 * 3600 * 1000
  let best: Card | null = null
  for (const c of cards) {
    if (c.lastPracticedAt && c.lastPracticedAt >= dayStart && c.lastPracticedAt < dayEnd) {
      if (!best || (c.lastPracticedAt ?? 0) > (best.lastPracticedAt ?? 0)) best = c
    }
  }
  return best
}

interface Props {
  cards: Card[]
  onMark: (cardId: string, text: string) => void
  onGoSteal: () => void
  onOpenCard: (id: string) => void
}

export function HomePage({ cards, onMark, onGoSteal, onOpenCard }: Props) {
  // 今天选中的句子：当天内固定，不随练习跳动
  const [todayId, setTodayId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (todayId && cards.some((c) => c.id === todayId)) return
    const pick = pickToday(cards)
    setTodayId(pick ? pick.id : null)
    setExpanded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const today = useMemo(() => cards.find((c) => c.id === todayId) ?? null, [cards, todayId])
  const usedToday = !!(today?.lastPracticedAt && isSameDay(today.lastPracticedAt, Date.now()))

  // 前两天练过的卡片（回看入口）
  const lookbacks = useMemo(() => {
    const now = startOfDay(Date.now())
    return [now - 24 * 3600 * 1000, now - 2 * 24 * 3600 * 1000].map((dayStart, i) => ({
      date: fmtDay(dayStart),
      card: cardPracticedOn(cards, dayStart),
      Icon: i === 0 ? IconFlower : i === 1 ? IconTree : IconSun,
    }))
  }, [cards])

  return (
    <div className="sk-page">
      {/* 上半屏留白；空库时中间放一句话 */}
      <div className="flex flex-1 items-center justify-center" style={{ minHeight: '38vh' }}>
        {cards.length === 0 && (
          <button type="button" onClick={onGoSteal} className="sk-icon-btn" style={{ fontSize: 'var(--fs-big)' }}>
            还没偷到。点下面。
          </button>
        )}
      </div>

      {/* 下半屏：今日一句 */}
      {today && (
        <div className="pb-2">
          <div className="flex items-start gap-3">
            <HandCheck
              used={usedToday}
              onToggle={() => onMark(today.id, today.original)}
              label={usedToday ? '今天用过了' : '我用上了'}
            />
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              style={{ fontSize: 'var(--fs-big)', lineHeight: 1.6 }}
              onClick={() => setExpanded((v) => !v)}
            >
              {today.original}
            </button>
          </div>
          <p className="mt-2 pl-[46px]" style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>
            偷于 {fmtDay(today.createdAt)}
          </p>

          {expanded && (
            <div className="mt-4 space-y-3 pl-[46px]" style={{ fontSize: 'var(--fs-base)' }}>
              {today.meaning && (
                <p style={{ color: 'var(--c-gray)' }}>{today.meaning}</p>
              )}
              {today.skeleton && (
                <p>
                  <SkeletonInline text={today.skeleton} />
                </p>
              )}
              {today.scenarios.length > 0 && (
                <div>
                  <p className="sk-label">什么时候用</p>
                  <ul className="space-y-1">
                    {today.scenarios.map((s, i) => (
                      <li key={i}>· {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {today.tone && (
                <p style={{ color: 'var(--c-gray)' }}>{today.tone}{today.avoid ? ` · 别用：${today.avoid}` : ''}</p>
              )}
              {today.examples.length > 0 && (
                <div>
                  <p className="sk-label">仿写</p>
                  <ol className="space-y-1">
                    {today.examples.map((ex, i) => (
                      <li key={i}>{i + 1}. {ex}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 底部栏 */}
      <div className="flex items-end justify-between gap-2 pb-6 pt-8">
        {/* 前两天回看 */}
        <div className="flex gap-4">
          {lookbacks.map(({ date, card, Icon }, i) => (
            <button
              key={i}
              type="button"
              className="sk-icon-btn flex-col gap-1"
              disabled={!card}
              onClick={() => card && onOpenCard(card.id)}
              style={{ color: card ? 'var(--c-ink)' : 'var(--c-gray)' }}
              aria-label={`回看 ${date} 练过的句子`}
            >
              <Icon size={26} />
              <span style={{ fontSize: 'var(--fs-tiny)' }}>{date}</span>
            </button>
          ))}
        </div>

        {/* 大按钮：进「偷」页 */}
        <button
          type="button"
          onClick={onGoSteal}
          className="sketch-lg sk-icon-btn"
          style={{ width: 88, height: 108, border: 'var(--bw) solid var(--c-ink)' }}
          aria-label="去偷一句"
        >
          <IconArrowUp size={34} />
        </button>

        {/* 练完提示 */}
        <div style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-tiny)', maxWidth: 72, textAlign: 'left' }}>
          {usedToday ? '明天日出再来' : ''}
        </div>
      </div>
    </div>
  )
}
