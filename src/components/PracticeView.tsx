import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from '@/types'

interface Props {
  open: boolean
  cards: Card[]
  onClose: () => void
  onMark: (cardId: string, text: string) => void
}

type Phase = 'idle' | 'practicing' | 'done'

function pickTwo(cards: Card[]): [Card, Card] | null {
  if (cards.length < 2) return null
  // 优先级：练得少的 > 练得多的；同次数时上次练习时间旧的 > 新的；再随机打散
  const sorted = cards
    .map((c) => ({ c, r: Math.random() }))
    .sort(
      (a, b) =>
        a.c.useCount - b.c.useCount ||
        (a.c.lastPracticedAt ?? 0) - (b.c.lastPracticedAt ?? 0) ||
        a.r - b.r,
    )
  return [sorted[0].c, sorted[1].c]
}

function pickScenario(card: Card): string {
  const pool = card.scenarios.length > 0 ? card.scenarios : ['试着在真实对话里用上它']
  return pool[Math.floor(Math.random() * pool.length)]
}

export function PracticeView({ open, cards, onClose, onMark }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [queue, setQueue] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [draft, setDraft] = useState('')
  const [marked, setMarked] = useState<Set<string>>(new Set())

  // 用 ref 读最新 cards，effect 只依赖 open，
  // 这样练习中 onMark 更新 cards 不会把队列重置回第一张
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  useEffect(() => {
    if (!open) return
    const picked = pickTwo(cardsRef.current)
    setQueue(picked ? [picked[0], picked[1]] : [])
    setIdx(0)
    setDraft('')
    setMarked(new Set())
    setPhase(picked ? 'practicing' : 'idle')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const current = queue[idx]
  // 场景在抽到这张卡时就固定下来，避免重渲染换题
  const scenario = useMemo(() => (current ? pickScenario(current) : ''), [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  function restart() {
    const picked = pickTwo(cardsRef.current)
    setQueue(picked ? [picked[0], picked[1]] : [])
    setIdx(0)
    setDraft('')
    setMarked(new Set())
    setPhase(picked ? 'practicing' : 'idle')
  }

  function advance() {
    if (idx + 1 < queue.length) {
      setIdx(idx + 1)
      setDraft('')
    } else {
      setPhase('done')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[min(640px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-ink-900">今日练习</h2>
            <p className="text-xs text-ink-500">
              {queue.length > 0
                ? `第 ${idx + 1} / ${queue.length} 张 · 优先抽练得少、放得久的`
                : '句子库还不够，先去加两张吧'}
            </p>
          </div>
          <button className="ink-btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'idle' && queue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-ink-500">
              <div className="mb-3 text-3xl">🎯</div>
              至少需要 2 张卡片才能开始今日练习。
            </div>
          ) : phase === 'done' ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="mb-2 text-4xl">✓</div>
              <h3 className="text-lg font-semibold text-ink-900">今日练习完成</h3>
              <p className="text-sm text-ink-500">已为 {marked.size} 张卡片记一次使用。</p>
              <div className="mt-4 flex gap-2">
                <button className="ink-btn-outline" onClick={restart}>
                  再来一组
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
                {current.meaning ? (
                  <p className="mt-1.5 text-sm text-ink-600">{current.meaning}</p>
                ) : null}
                <p className="mt-2 text-xs text-ink-500">
                  主题：{current.topic || '未分类'} · 练过 {current.useCount} 次
                </p>
              </div>

              <div className="rounded-xl border border-ink-900 bg-white p-4 text-sm">
                <p className="whitespace-pre-line text-ink-800">场景：{scenario}</p>
                <p className="mt-2 font-serif text-ink-900">
                  请用上这句：<SkeletonInline text={current.skeleton} />
                </p>
                {current.skeleton !== current.original ? (
                  <details className="mt-2 text-xs text-ink-500">
                    <summary className="cursor-pointer select-none">对照原句</summary>
                    <p className="mt-1 font-serif text-ink-700">{current.original}</p>
                  </details>
                ) : null}
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
                  点「我用上了」后，这段话会存进这张卡片的练习记录里。
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* 底部按钮 */}
        {current && phase === 'practicing' ? (
          <div className="flex items-center justify-between border-t border-ink-200 px-5 py-3">
            <button className="ink-btn-ghost" onClick={advance}>
              跳过
            </button>
            <button
              className="ink-btn-primary"
              disabled={!draft.trim()}
              onClick={() => {
                onMark(current.id, draft)
                setMarked((s) => new Set(s).add(current.id))
                advance()
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

function SkeletonInline({ text }: { text: string }) {
  const parts = text.split('___')
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 ? <span className="skeleton-mark"> ___ </span> : null}
        </span>
      ))}
    </>
  )
}
