import { useEffect, useMemo, useState } from 'react'
import type { Card } from '@/types'

interface Props {
  open: boolean
  cards: Card[]
  onClose: () => void
  onMark: (cardId: string) => void
}

type Phase = 'idle' | 'practicing' | 'done'

function pickTwo(cards: Card[]): [Card, Card] | null {
  if (cards.length < 2) return null
  // 优先挑 useCount 小、最后练习时间旧的；同分再随机一下
  const scored = [...cards].map((c) => {
    const score = c.useCount * 1e10 - (c.lastPracticedAt ?? 0)
    return { c, r: Math.random(), score }
  })
  scored.sort((a, b) => a.score - b.score || a.r - b.r)
  return [scored[0].c, scored[1].c]
}

function buildScenario(card: Card): string {
  // 选一条场景，没有就用骨架当提示
  const pool = card.scenarios.length > 0 ? card.scenarios : ['试着在真实对话里用上它']
  const scenario = pool[Math.floor(Math.random() * pool.length)]
  return `场景：${scenario}\n请用上这句话：${card.skeleton}`
}

export function PracticeView({ open, cards, onClose, onMark }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [queue, setQueue] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [draft, setDraft] = useState('')
  const [marked, setMarked] = useState<Set<string>>(new Set())

  // 每次打开就准备两张
  useEffect(() => {
    if (!open) return
    const picked = pickTwo(cards)
    setQueue(picked ? [picked[0], picked[1]] : [])
    setIdx(0)
    setDraft('')
    setMarked(new Set())
    setPhase(picked ? 'practicing' : 'idle')
  }, [open, cards])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const current = queue[idx]
  const total = queue.length
  const scenario = useMemo(() => (current ? buildScenario(current) : ''), [current])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[min(640px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-ink-900">今日练习</h2>
            <p className="text-xs text-ink-500">
              {total > 0
                ? `第 ${idx + 1} / ${total} 张 · 抽最近没怎么练过的`
                : '句子库还不够，先去加两张吧'}
            </p>
          </div>
          <button className="ink-btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'idle' && total === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-ink-500">
              <div className="mb-3 text-3xl">🎯</div>
              至少需要 2 张卡片才能开始今日练习。
            </div>
          ) : phase === 'done' ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="mb-2 text-4xl">✓</div>
              <h3 className="text-lg font-semibold text-ink-900">今日练习完成</h3>
              <p className="text-sm text-ink-500">
                已为 {marked.size} 张卡片记一次使用。
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  className="ink-btn-outline"
                  onClick={() => {
                    const picked = pickTwo(cards)
                    setQueue(picked ? [picked[0], picked[1]] : [])
                    setIdx(0)
                    setDraft('')
                    setMarked(new Set())
                    setPhase(picked ? 'practicing' : 'idle')
                  }}
                >
                  再来两组
                </button>
                <button className="ink-btn-primary" onClick={onClose}>
                  收工
                </button>
              </div>
            </div>
          ) : current ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-ink-200 bg-ink-50/70 p-4">
                <p className="font-serif text-lg leading-snug text-ink-900">
                  {current.original}
                </p>
                <p className="mt-2 text-xs text-ink-500">
                  主题：{current.topic || '未分类'} · 练过 {current.useCount} 次
                </p>
              </div>

              <div className="whitespace-pre-line rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-ink-800">
                {scenario}
              </div>

              <div>
                <label className="ink-label">你的回答（用上上面那句话）</label>
                <textarea
                  className="ink-input min-h-[140px] font-serif"
                  placeholder="可以先用中文想，再用英文写下来…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-500">
                  这一步只是让你过一遍嘴，写完点「我用上了」就给这张卡片记一次。
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* 底部按钮 */}
        {current && phase === 'practicing' ? (
          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3">
            <button
              className="ink-btn-ghost"
              onClick={() => {
                // 跳过本张，但不记次数
                if (idx + 1 < queue.length) {
                  setIdx(idx + 1)
                  setDraft('')
                } else {
                  setPhase('done')
                }
              }}
            >
              跳过
            </button>
            <button
              className="ink-btn-primary"
              disabled={!draft.trim()}
              onClick={() => {
                onMark(current.id)
                setMarked((s) => new Set(s).add(current.id))
                if (idx + 1 < queue.length) {
                  setIdx(idx + 1)
                  setDraft('')
                } else {
                  setPhase('done')
                }
              }}
            >
              我用上了 →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
