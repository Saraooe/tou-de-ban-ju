import { useEffect, useMemo, useState } from 'react'
import type { Card, PracticeItem, PracticeSession, PracticeStatus } from '@/types'
import { storage } from '@/storage/localStorageAdapter'
import {
  PRACTICE_STATUS_DESC,
  PRACTICE_STATUS_LABEL,
  dayKey,
  fallbackOralQuestion,
  fallbackRecallHint,
  pickPracticeQueue,
  rankForReview,
} from '@/utils/practice'
import { SkeletonInline } from './HomePage'
import { IconArrowLeft, IconClose } from './hand/HandIcon'

interface Props {
  cards: Card[]
  sessions: PracticeSession[]
  onClose: () => void
  /** 练习完成时把更新后的 cards / sessions 传回 App，让顶层 state 同步 */
  onFinish: (updates: { cards: Card[]; sessions: PracticeSession[] }) => void
}

type Phase = 'queue' | 'reveal' | 'summary' | 'empty'

/** 一次练习的结果汇总，给 summary 用 */
interface ItemResult {
  card: Card
  status: PracticeStatus
  selfText?: string
  at: number
}

const DAILY_TARGET = 3

export function PracticeView({ cards, sessions, onClose, onFinish }: Props) {
  const today = useMemo(() => dayKey(Date.now()), [])

  // 当天待练的 3 张（按优先级挑，跳过今日已练）
  const queue = useMemo(
    () => pickPracticeQueue(cards, sessions, today, DAILY_TARGET),
    [cards, sessions, today],
  )

  const [phase, setPhase] = useState<Phase>(queue.length === 0 ? 'empty' : 'queue')
  const [idx, setIdx] = useState(0)
  const [selfText, setSelfText] = useState('')
  const [results, setResults] = useState<ItemResult[]>([])

  // Esc 退出
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (queue.length === 0) {
    return <EmptyState onClose={onClose} />
  }

  const current = queue[idx]
  const recallHint = current.recallHint || fallbackRecallHint(current)
  const oralQuestion = current.oralQuestion || fallbackOralQuestion(current)
  const isLast = idx === queue.length - 1

  function commit(status: PracticeStatus) {
    if (!current) return
    const at = Date.now()
    const trimmed = selfText.trim()
    const item: PracticeItem = { cardId: current.id, status, at, selfText: trimmed || undefined }

    // 写 localStorage：会话 + 卡片统计
    storage.appendPracticeSessionItem(today, item)
    storage.bumpPracticeStats(current.id, status, at)

    setResults((r) => [...r, { card: current, status, selfText: trimmed || undefined, at }])
    setSelfText('')

    if (isLast) {
      // 拉一遍最新数据回传
      onFinish({ cards: storage.listCards(), sessions: storage.listPracticeSessions() })
      setPhase('summary')
    } else {
      setIdx((i) => i + 1)
      setPhase('queue')
    }
  }

  if (phase === 'summary') {
    return <Summary results={results} allCards={cards} onClose={onClose} />
  }

  return (
    <div className="sk-page">
      {/* 顶部：进度 + 退出 */}
      <div className="flex items-center justify-between py-1">
        <button type="button" className="sk-icon-btn" onClick={onClose} aria-label="退出练习">
          <IconArrowLeft size={22} />
        </button>
        <span style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>
          第 {idx + 1} / {queue.length} 句
        </span>
        <button type="button" className="sk-icon-btn" onClick={onClose} aria-label="退出">
          <IconClose size={22} />
        </button>
      </div>

      {/* 回忆提示：中文 + 口语问题，原句默认不显示 */}
      <div className="mt-6 space-y-5">
        <div>
          <p className="sk-label">想表达（中文）</p>
          <p className="mt-1" style={{ fontSize: 'var(--fs-base)', lineHeight: 1.6 }}>
            {recallHint}
          </p>
        </div>
        <div>
          <p className="sk-label">口语问题</p>
          <p
            className="mt-1"
            style={{ fontSize: 'var(--fs-base)', lineHeight: 1.6, fontFamily: 'var(--font-serif)' }}
          >
            {oralQuestion}
          </p>
        </div>
      </div>

      {/* 自填版本（可选） */}
      <div className="mt-6">
        <p className="sk-label">你想到了什么版本？（可选）</p>
        <textarea
          className="mt-1 w-full"
          style={{
            background: 'var(--c-paper)',
            border: 'var(--bw) solid var(--c-ink)',
            borderRadius: 'var(--br-base)',
            padding: '10px 12px',
            minHeight: 88,
            fontSize: 'var(--fs-base)',
            fontFamily: 'var(--font-serif)',
            color: 'var(--c-ink)',
            outline: 'none',
            resize: 'vertical',
          }}
          placeholder="先用中文想一下，再用英文试着说出来…"
          value={selfText}
          onChange={(e) => setSelfText(e.target.value)}
        />
      </div>

      {/* 查看原句 */}
      {phase === 'queue' ? (
        <div className="mt-4">
          <button
            type="button"
            className="sk-btn"
            onClick={() => setPhase('reveal')}
            style={{ width: '100%' }}
          >
            看原句对照
          </button>
        </div>
      ) : (
        <ReferenceBlock card={current} />
      )}

      {/* 三状态选择：永远在最底，方便拇指点 */}
      <div className="mt-auto pt-6 pb-2">
        <p className="sk-label">这一句练得怎么样？</p>
        <div className="mt-2 flex flex-col gap-2">
          <StatusButton status="recalled" primary onClick={() => commit('recalled')} />
          <StatusButton status="hinted" onClick={() => commit('hinted')} />
          <StatusButton status="cant" onClick={() => commit('cant')} />
        </div>
      </div>
    </div>
  )
}

// ---------- 子组件 ----------

function StatusButton({
  status,
  onClick,
  primary,
}: {
  status: PracticeStatus
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      className={primary ? 'sk-btn sk-btn-solid' : 'sk-btn'}
      onClick={onClick}
      style={{ minHeight: 52, textAlign: 'left', paddingLeft: 16 }}
    >
      <span style={{ fontSize: 'var(--fs-big)' }}>{PRACTICE_STATUS_LABEL[status]}</span>
      <span className="ml-2" style={{ fontSize: 'var(--fs-tiny)', color: 'var(--c-gray)' }}>
        {PRACTICE_STATUS_DESC[status]}
      </span>
    </button>
  )
}

function ReferenceBlock({ card }: { card: Card }) {
  return (
    <div className="mt-4 sketch" style={{ padding: 16 }}>
      <p className="sk-label">原句</p>
      <p
        className="mt-1"
        style={{ fontSize: 'var(--fs-big)', lineHeight: 1.5, fontFamily: 'var(--font-serif)' }}
      >
        {card.original}
      </p>
      {card.meaning ? (
        <p className="mt-2" style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-base)' }}>
          {card.meaning}
        </p>
      ) : null}
      {card.skeleton && card.skeleton !== card.original ? (
        <div className="mt-3">
          <p className="sk-label">句型</p>
          <p
            className="mt-1"
            style={{ fontSize: 'var(--fs-base)', fontFamily: 'var(--font-serif)' }}
          >
            <SkeletonInline text={card.skeleton} />
          </p>
        </div>
      ) : null}
      {card.scenarios.length > 0 ? (
        <div className="mt-3">
          <p className="sk-label">什么时候用</p>
          <ul className="mt-1 space-y-0.5" style={{ fontSize: 'var(--fs-base)' }}>
            {card.scenarios.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="sk-page">
      <div className="flex items-center justify-between py-1">
        <button type="button" className="sk-icon-btn" onClick={onClose} aria-label="退出">
          <IconArrowLeft size={22} />
        </button>
        <span style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>今日练习</span>
        <span style={{ width: 22 }} />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p style={{ fontSize: 'var(--fs-big)' }}>今天没得练了。</p>
        <p className="mt-2" style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-base)' }}>
          句子库里的卡片今天都过了一遍，明天再来。
        </p>
        <button type="button" className="sk-btn sk-btn-solid mt-6" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  )
}

function Summary({
  results,
  allCards,
  onClose,
}: {
  results: ItemResult[]
  allCards: Card[]
  onClose: () => void
}) {
  const counts = { recalled: 0, hinted: 0, cant: 0 }
  for (const r of results) counts[r.status]++

  // 找出"值得优先练的"：本次说不出 + 依赖提示
  const needMore = results
    .filter((r) => r.status === 'cant' || r.status === 'hinted')
    .sort((a, b) => {
      // cant 排前
      if (a.status !== b.status) return a.status === 'cant' ? -1 : 1
      return 0
    })

  // 长期仍未掌握：把整个库按练习统计排一下，挑"说不出/靠提示"占比高的
  const longTerm = rankForReview(allCards)
    .filter((c) => {
      const ps = c.practiceStats
      if (!ps) return false
      const total = ps.recalled + ps.hinted + ps.cant
      if (total === 0) return false
      // 靠提示 + 说不出的比例 > 50% 才算
      return (ps.hinted + ps.cant) / total > 0.5
    })
    .slice(0, 5)

  return (
    <div className="sk-page">
      <div className="flex items-center justify-between py-1">
        <span style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>今日练习</span>
        <button type="button" className="sk-icon-btn" onClick={onClose} aria-label="关闭">
          <IconClose size={22} />
        </button>
        <span style={{ width: 22 }} />
      </div>

      <div className="mt-6 text-center">
        <p style={{ fontSize: 'var(--fs-big)' }}>今天练了 {results.length} 句。</p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <SummaryCell label="主动想起" n={counts.recalled} />
        <SummaryCell label="靠提示" n={counts.hinted} />
        <SummaryCell label="说不出" n={counts.cant} />
      </div>

      {needMore.length > 0 ? (
        <div className="mt-6">
          <p className="sk-label">这几句下次还得多练</p>
          <ul className="mt-2 space-y-2">
            {needMore.map((r, i) => (
              <li key={i} className="sketch" style={{ padding: '10px 12px' }}>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--fs-base)',
                    lineHeight: 1.5,
                  }}
                >
                  {r.card.original}
                </p>
                <p
                  className="mt-1"
                  style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-tiny)' }}
                >
                  {PRACTICE_STATUS_LABEL[r.status]} · {r.card.topic || '未分类'}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-center" style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-base)' }}>
          这几句都能主动想起来了，稳。
        </p>
      )}

      {longTerm.length > 0 ? (
        <div className="mt-6">
          <p className="sk-label">库里的老顽固（按卡优先）</p>
          <ul className="mt-2 space-y-1" style={{ fontSize: 'var(--fs-base)' }}>
            {longTerm.map((c) => {
              const ps = c.practiceStats!
              return (
                <li key={c.id} className="flex items-baseline justify-between gap-2">
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {c.original}
                  </span>
                  <span style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-tiny)' }}>
                    说不出 {ps.cant} · 提示 {ps.hinted} · 想起 {ps.recalled}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto pt-6 pb-2 flex gap-2">
        <button type="button" className="sk-btn" onClick={onClose} style={{ flex: 1 }}>
          回首页
        </button>
      </div>
    </div>
  )
}

function SummaryCell({ label, n }: { label: string; n: number }) {
  return (
    <div className="sketch" style={{ padding: '10px 4px', textAlign: 'center' }}>
      <p style={{ fontSize: 'var(--fs-big)', fontFamily: 'var(--font-serif)' }}>{n}</p>
      <p className="mt-1" style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-tiny)' }}>
        {label}
      </p>
    </div>
  )
}
