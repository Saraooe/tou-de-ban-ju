import { useMemo } from 'react'
import type { Card } from '@/types'

interface Props {
  cards: Card[]
  selectedTopic: string | null // null = 全部
  onSelect: (topic: string | null) => void
  selectedCardId?: string | null
  onSelectCard: (id: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
}

export function CardList({
  cards,
  selectedTopic,
  onSelect,
  selectedCardId,
  onSelectCard,
  searchQuery,
  onSearchChange,
}: Props) {
  // 主题列表 + 数量
  const topics = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of cards) {
      const t = c.topic?.trim() || '未分类'
      map.set(t, (map.get(t) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [cards])

  const filtered = useMemo(() => {
    let list = cards
    if (selectedTopic) list = list.filter((c) => (c.topic?.trim() || '未分类') === selectedTopic)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.original.toLowerCase().includes(q) ||
          c.skeleton.toLowerCase().includes(q) ||
          c.examples.some((e) => e.toLowerCase().includes(q)),
      )
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [cards, selectedTopic, searchQuery])

  return (
    <div className="flex h-full min-h-0">
      {/* 主题栏（移动端是横滑条，桌面是竖列） */}
      <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-ink-200 bg-white p-3 sm:block">
        <h3 className="ink-label px-2">主题</h3>
        <nav className="flex flex-col gap-0.5">
          <TopicItem
            active={selectedTopic === null}
            label="全部"
            count={cards.length}
            onClick={() => onSelect(null)}
          />
          {topics.map((t) => (
            <TopicItem
              key={t.name}
              active={selectedTopic === t.name}
              label={t.name}
              count={t.count}
              onClick={() => onSelect(t.name)}
            />
          ))}
        </nav>
      </aside>

      {/* 卡片列表 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 移动端主题横滑 */}
        <div className="border-b border-ink-200 bg-white px-3 py-2 sm:hidden">
          <div className="flex gap-2 overflow-x-auto">
            <button
              className={`ink-chip shrink-0 ${selectedTopic === null ? 'ink-chip-active' : ''}`}
              onClick={() => onSelect(null)}
            >
              全部 · {cards.length}
            </button>
            {topics.map((t) => (
              <button
                key={t.name}
                className={`ink-chip shrink-0 ${selectedTopic === t.name ? 'ink-chip-active' : ''}`}
                onClick={() => onSelect(t.name)}
              >
                {t.name} · {t.count}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-ink-200 bg-white px-3 py-2">
          <input
            className="ink-input"
            placeholder="搜索原句 / 句型 / 仿写…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-ink-500">
              这里还没有句子，去粘贴第一句吧。
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((c) => (
                <li key={c.id}>
                  <CardItem
                    card={c}
                    active={selectedCardId === c.id}
                    onClick={() => onSelectCard(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function TopicItem({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
        active ? 'bg-accent/10 text-accent' : 'text-ink-700 hover:bg-ink-100'
      }`}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      <span
        className={`shrink-0 rounded-full px-1.5 text-[10px] ${
          active ? 'bg-accent/20 text-accent' : 'bg-ink-100 text-ink-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function CardItem({
  card,
  active,
  onClick,
}: {
  card: import('@/types').Card
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`ink-card ink-card-hover group block w-full p-4 text-left ${
        active ? 'border-accent ring-2 ring-accent/30' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="ink-chip">{card.topic || '未分类'}</span>
        <span className="text-ink-400">练过 {card.useCount} 次</span>
      </div>
      <p className="font-serif text-base leading-snug text-ink-900 line-clamp-3">
        {card.original}
      </p>
      <p className="mt-2 text-xs text-ink-500 line-clamp-1">
        <SkeletonHint text={card.skeleton} />
      </p>
    </button>
  )
}

function SkeletonHint({ text }: { text: string }) {
  // 把 ___ 高亮展示出来，作为视觉提示
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
