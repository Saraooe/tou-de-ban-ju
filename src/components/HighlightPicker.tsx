import { useEffect, useState } from 'react'
import type { Settings } from '@/types'
import { extractHighlights, type Highlight } from '@/services/deepseek'

interface Item extends Highlight {
  checked: boolean
}

interface Props {
  open: boolean
  passage: string        // 已清洗（去 emoji/#标签）并截断过的原文
  truncated: boolean     // 是否因超长被截断过（用于提示）
  settings: Settings
  onClose: () => void
  onConfirm: (sentences: string[]) => void
  onTreatWhole: () => void
  onNotify: (msg: string) => void
}

export function HighlightPicker({
  open,
  passage,
  truncated,
  settings,
  onClose,
  onConfirm,
  onTreatWhole,
  onNotify,
}: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 打开面板时拉一次候选；关闭面板取消请求结果
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setItems([])
    setError(null)
    setLoading(true)
    extractHighlights(passage, settings)
      .then((list) => {
        if (cancelled) return
        if (list.length === 0) {
          setError('AI 没找到值得偷的句子。可以「整段当一句处理」，或换个内容再试。')
          return
        }
        setItems(list.map((h, i) => ({ ...h, checked: i < 3 })))
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '未知错误')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onClose])

  if (!open) return null

  const selectedCount = items.filter((i) => i.checked).length

  function toggle(i: number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, checked: !it.checked } : it)))
  }

  function editSentence(i: number, text: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, sentence: text } : it)))
  }

  async function findMore() {
    setMoreLoading(true)
    try {
      const list = await extractHighlights(
        passage,
        settings,
        items.map((i) => i.sentence),
      )
      if (list.length === 0) {
        onNotify('没有更多了，AI 找不出新句子。')
        return
      }
      setItems((prev) => [...prev, ...list.map((h) => ({ ...h, checked: false }))])
    } catch (e) {
      onNotify(e instanceof Error ? e.message : '找新句子失败，请重试。')
    } finally {
      setMoreLoading(false)
    }
  }

  function retry() {
    setError(null)
    setLoading(true)
    setItems([])
    extractHighlights(passage, settings)
      .then((list) => {
        if (list.length === 0) {
          setError('AI 没找到值得偷的句子。可以「整段当一句处理」，或换个内容再试。')
          return
        }
        setItems(list.map((h, i) => ({ ...h, checked: i < 3 })))
      })
      .catch((e) => setError(e instanceof Error ? e.message : '未知错误'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      {/* 手机端全屏，桌面端居中弹窗 */}
      <div className="relative flex h-[100dvh] w-full flex-col bg-white sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-ink-200 sm:shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">挑出值得偷的句子</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              AI 从你粘贴的内容里找了几句，勾选想学的。
            </p>
          </div>
          <button
            className="ink-btn-ghost min-h-[44px]"
            onClick={onClose}
            disabled={loading}
          >
            关闭
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {truncated ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              内容较长，只分析了前 4000 字符。
            </p>
          ) : null}

          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-ink-500">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
              AI 正在找亮点…
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-sm text-sm text-red-600">{error}</p>
              <div className="flex gap-2">
                <button className="ink-btn-outline min-h-[44px]" onClick={retry}>
                  重试
                </button>
                <button className="ink-btn-ghost min-h-[44px]" onClick={onTreatWhole}>
                  整段当一句处理
                </button>
              </div>
            </div>
          ) : (
            items.map((it, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 transition ${
                  it.checked ? 'border-ink-900 bg-ink-50/60' : 'border-ink-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 触控区域加大的复选框 */}
                  <label className="flex min-h-[44px] cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-ink-900"
                      checked={it.checked}
                      onChange={() => toggle(i)}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <textarea
                      className="ink-input min-h-[44px] resize-y font-serif text-base"
                      value={it.sentence}
                      rows={2}
                      onChange={(e) => editSentence(i, e.target.value)}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{it.reason}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部按钮 */}
        {!loading && !error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 px-5 py-3">
            <div className="flex gap-2">
              <button
                className="ink-btn-outline min-h-[44px]"
                onClick={findMore}
                disabled={moreLoading}
              >
                {moreLoading ? '找句子中…' : '再多找几句'}
              </button>
              <button className="ink-btn-ghost min-h-[44px]" onClick={onTreatWhole}>
                整段当一句处理
              </button>
            </div>
            <button
              className="ink-btn-primary min-h-[44px]"
              disabled={selectedCount === 0}
              onClick={() => onConfirm(items.filter((i) => i.checked).map((i) => i.sentence))}
            >
              拆解选中的 {selectedCount} 句
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
