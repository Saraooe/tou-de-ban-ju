import { useEffect, useState } from 'react'
import type { Card } from '@/types'
import { uid } from '@/utils/id'
import { EmptyState } from './EmptyState'

export type DraftPayload = Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'lastPracticedAt'>

interface Props {
  selected: Card | null
  draft: DraftPayload | null // AI 生成的草稿
  onChangeDraft: (next: DraftPayload) => void
  onSaveDraft: () => void
  onCancelDraft: () => void
  onSaveExisting: (card: Card) => void
  onDelete: (id: string) => void
  onClose: () => void
  knownTopics: string[]
}

export function CardDetail({
  selected,
  draft,
  onChangeDraft,
  onSaveDraft,
  onCancelDraft,
  onSaveExisting,
  onDelete,
  onClose,
  knownTopics,
}: Props) {
  if (draft) {
    return (
      <DraftEditor
        draft={draft}
        knownTopics={knownTopics}
        onChange={onChangeDraft}
        onSave={onSaveDraft}
        onCancel={onCancelDraft}
      />
    )
  }
  if (selected) {
    return (
      <ExistingCardView
        card={selected}
        knownTopics={knownTopics}
        onSave={onSaveExisting}
        onDelete={onDelete}
        onClose={onClose}
      />
    )
  }
  return (
    <div className="hidden h-full lg:block">
      <EmptyState
        title="右侧还没有卡片"
        description="从上面粘贴一句英文，或在中间挑一张卡片查看详情。"
        icon="✎"
      />
    </div>
  )
}

// ---------- 草稿编辑器（AI 生成后的卡片） ----------

function DraftEditor({
  draft,
  knownTopics,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DraftPayload
  knownTopics: string[]
  onChange: (next: DraftPayload) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <Editor
      title="新卡片（待保存）"
      subtitle="所有字段都可以再改；改完点「保存到句子库」才进库。"
      value={draft}
      knownTopics={knownTopics}
      onSave={onSave}
      onCancel={onCancel}
      onUpdate={(k, v) => onChange({ ...draft, [k]: v })}
      onUpdateArr={(key, idx, val) => {
        const next = [...draft[key]]
        next[idx] = val
        onChange({ ...draft, [key]: next })
      }}
      onAddArr={(key) => onChange({ ...draft, [key]: [...draft[key], ''] })}
      onRemoveArr={(key, idx) =>
        onChange({ ...draft, [key]: draft[key].filter((_, i) => i !== idx) })
      }
      primaryLabel="保存到句子库"
    />
  )
}

// ---------- 已有卡片查看/编辑 ----------

function ExistingCardView({
  card,
  knownTopics,
  onSave,
  onDelete,
  onClose,
}: {
  card: Card
  knownTopics: string[]
  onSave: (c: Card) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Card>(card)

  useEffect(() => {
    setDraft(card)
    setEditing(false)
  }, [card.id, card.updatedAt])

  if (!editing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="ink-chip">{card.topic || '未分类'}</span>
            <span>练过 {card.useCount} 次</span>
          </div>
          <div className="flex gap-1">
            <button className="ink-btn-ghost" onClick={onClose}>关闭</button>
            <button className="ink-btn-outline" onClick={() => setEditing(true)}>编辑</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <DetailBody card={card} />
        </div>
        <div className="border-t border-ink-200 px-5 py-3 text-right">
          <button
            className="text-xs text-red-600 hover:text-red-700"
            onClick={() => {
              if (confirm('确定删除这张卡片吗？')) onDelete(card.id)
            }}
          >
            删除卡片
          </button>
        </div>
      </div>
    )
  }

  return (
    <Editor
      title="编辑卡片"
      subtitle="改动会立即保存到本地。"
      value={draft}
      knownTopics={knownTopics}
      onSave={() => {
        onSave(draft)
        setEditing(false)
      }}
      onCancel={() => {
        setDraft(card)
        setEditing(false)
      }}
      onUpdate={(k, v) => setDraft({ ...draft, [k]: v as never })}
      onUpdateArr={(key, idx, val) => {
        const next = [...draft[key]]
        next[idx] = val
        setDraft({ ...draft, [key]: next })
      }}
      onAddArr={(key) => setDraft({ ...draft, [key]: [...draft[key], ''] })}
      onRemoveArr={(key, idx) =>
        setDraft({ ...draft, [key]: draft[key].filter((_, i) => i !== idx) })
      }
      primaryLabel="保存"
    />
  )
}

// ---------- 通用编辑器（草稿/编辑共用） ----------

function Editor({
  title,
  subtitle,
  value,
  knownTopics,
  onSave,
  onCancel,
  onUpdate,
  onUpdateArr,
  onAddArr,
  onRemoveArr,
  primaryLabel,
}: {
  title: string
  subtitle: string
  value: DraftPayload
  knownTopics: string[]
  onSave: () => void
  onCancel: () => void
  onUpdate: <K extends keyof DraftPayload>(k: K, v: DraftPayload[K]) => void
  onUpdateArr: (k: 'scenarios' | 'examples', i: number, v: string) => void
  onAddArr: (k: 'scenarios' | 'examples') => void
  onRemoveArr: (k: 'scenarios' | 'examples', i: number) => void
  primaryLabel: string
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-ink-200 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
        </div>
        <div className="flex gap-1">
          <button className="ink-btn-ghost" onClick={onCancel}>取消</button>
          <button className="ink-btn-primary" onClick={onSave}>{primaryLabel}</button>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <label className="ink-label">原句</label>
          <textarea
            className="ink-input font-serif text-base"
            value={value.original}
            onChange={(e) => onUpdate('original', e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <label className="ink-label">释义（一句话中文，实际含义）</label>
          <textarea
            className="ink-input text-sm"
            value={value.meaning}
            onChange={(e) => onUpdate('meaning', e.target.value)}
            rows={2}
            placeholder="比如：想说『我早就想去试试了』，带一点早就想但一直没动的语气"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="ink-label">主题</label>
            <input
              className="ink-input"
              value={value.topic}
              placeholder="例：casual plans / 反馈 / 抱怨"
              onChange={(e) => onUpdate('topic', e.target.value)}
              list="known-topics"
            />
            <datalist id="known-topics">
              {knownTopics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="ink-label">来源链接（可选）</label>
            <input
              className="ink-input font-mono text-xs"
              value={value.sourceLink ?? ''}
              onChange={(e) => onUpdate('sourceLink', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="ink-label">句型骨架（用 ___ 标出可替换部分）</label>
          <input
            className="ink-input font-serif"
            value={value.skeleton}
            onChange={(e) => onUpdate('skeleton', e.target.value)}
          />
          {value.suggestedTopics && value.suggestedTopics.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-xs text-ink-500">AI 建议主题：</span>
              {value.suggestedTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="ink-chip hover:bg-accent/10"
                  onClick={() => onUpdate('topic', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="ink-label">什么时候用（2–3 个场景）</label>
          <div className="space-y-1.5">
            {value.scenarios.map((s, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className="ink-input"
                  value={s}
                  onChange={(e) => onUpdateArr('scenarios', i, e.target.value)}
                />
                <button
                  className="ink-btn-ghost shrink-0"
                  onClick={() => onRemoveArr('scenarios', i)}
                  title="删除"
                >
                  −
                </button>
              </div>
            ))}
            <button className="ink-btn-ghost text-xs" onClick={() => onAddArr('scenarios')}>
              + 加一个场景
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="ink-label">语气 / 场合</label>
            <input
              className="ink-input"
              value={value.tone}
              onChange={(e) => onUpdate('tone', e.target.value)}
            />
          </div>
          <div>
            <label className="ink-label">哪些场合别用</label>
            <input
              className="ink-input"
              value={value.avoid}
              onChange={(e) => onUpdate('avoid', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="ink-label">3 个仿写句</label>
          <div className="space-y-1.5">
            {value.examples.map((ex, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className="ink-input font-serif"
                  value={ex}
                  onChange={(e) => onUpdateArr('examples', i, e.target.value)}
                />
                <button
                  className="ink-btn-ghost shrink-0"
                  onClick={() => onRemoveArr('examples', i)}
                  title="删除"
                >
                  −
                </button>
              </div>
            ))}
            <button className="ink-btn-ghost text-xs" onClick={() => onAddArr('examples')}>
              + 加一句仿写
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- 详情只读视图 ----------

function DetailBody({ card }: { card: Card }) {
  return (
    <div className="space-y-4">
      <p className="font-serif text-2xl leading-snug text-ink-900">{card.original}</p>
      {card.sourceLink ? (
        <a
          href={card.sourceLink}
          target="_blank"
          rel="noreferrer"
          className="inline-block break-all text-xs text-accent hover:underline"
        >
          来源 ↗
        </a>
      ) : null}

      {card.meaning ? (
        <Section title="释义">
          <p className="text-base text-ink-900">{card.meaning}</p>
        </Section>
      ) : null}

      <Section title="句型骨架">
        <SkeletonView text={card.skeleton} />
      </Section>

      <Section title="什么时候用">
        {card.scenarios.length === 0 ? (
          <p className="text-sm text-ink-400">（未填）</p>
        ) : (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-800">
            {card.scenarios.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Section title="语气 / 场合">
          <p className="text-sm text-ink-800">{card.tone || '—'}</p>
        </Section>
        <Section title="别在什么场合用">
          <p className="text-sm text-ink-800">{card.avoid || '无特别禁忌'}</p>
        </Section>
      </div>

      <Section title="仿写">
        {card.examples.length === 0 ? (
          <p className="text-sm text-ink-400">（未填）</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 font-serif text-sm text-ink-800">
            {card.examples.map((ex, i) => (
              <li key={i}>{ex}</li>
            ))}
          </ol>
        )}
      </Section>

      <div className="pt-2 text-xs text-ink-400">
        创建于 {new Date(card.createdAt).toLocaleString('zh-CN')}
        {card.lastPracticedAt
          ? ` · 上次练习 ${new Date(card.lastPracticedAt).toLocaleString('zh-CN')}`
          : ' · 还没练过'}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="ink-label">{title}</h4>
      <div className="rounded-lg bg-ink-50/70 p-3">{children}</div>
    </div>
  )
}

function SkeletonView({ text }: { text: string }) {
  const parts = text.split('___')
  if (parts.length === 1) return <p className="font-serif text-base text-ink-800">{text}</p>
  return (
    <p className="font-serif text-base leading-relaxed text-ink-800">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 ? <span className="skeleton-mark"> ___ </span> : null}
        </span>
      ))}
    </p>
  )
}

// 给 App.tsx 用，构造一个新卡片的工厂
export function makeCardFromDraft(d: DraftPayload): Card {
  const t = Date.now()
  return {
    id: uid(),
    useCount: 0,
    createdAt: t,
    updatedAt: t,
    ...d,
  }
}
