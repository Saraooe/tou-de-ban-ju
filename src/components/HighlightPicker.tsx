import { useEffect, useState } from 'react'
import type { Settings } from '@/types'
import { extractHighlights, type Highlight } from '@/services/deepseek'
import { HandCheck } from './hand/HandCheck'
import { IconClose } from './hand/HandIcon'

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
      <div className="absolute inset-0" style={{ background: 'rgba(17,17,17,0.3)' }} onClick={loading ? undefined : onClose} />
      {/* 手机端全屏，桌面端居中弹窗 */}
      <div className="sketch relative flex h-[100dvh] w-full flex-col bg-white sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-[480px]">
        {/* 标题栏 */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            <h2 style={{ fontSize: 'var(--fs-big)' }}>挑出值得偷的句子</h2>
            <p style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>
              AI 从你粘贴的内容里找了几句，点圆圈勾选。
            </p>
          </div>
          <button
            type="button"
            className="sk-icon-btn"
            style={{ minHeight: 'var(--tap)' }}
            onClick={onClose}
            disabled={loading}
            aria-label="关闭"
          >
            <IconClose size={22} />
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {truncated ? (
            <p style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>
              内容较长，只分析了前 4000 字符。
            </p>
          ) : null}

          {loading ? (
            <div
              className="flex h-40 items-center justify-center"
              style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-base)' }}
            >
              AI 正在找亮点…
            </div>
          ) : error ? (
            <div className="flex h-40 flex-col items-center justify-center gap-4 text-center">
              <p className="max-w-sm" style={{ fontSize: 'var(--fs-small)' }}>{error}</p>
              <div className="flex gap-3">
                <button type="button" className="sk-btn" onClick={retry}>
                  再试一次
                </button>
                <button type="button" className="sk-btn" onClick={onTreatWhole}>
                  整段当一句处理
                </button>
              </div>
            </div>
          ) : (
            items.map((it, i) => (
              <div key={i} className="flex items-start gap-2">
                {/* 手绘圆圈勾选 */}
                <HandCheck used={it.checked} onToggle={() => toggle(i)} label="勾选这句" />
                <div className="min-w-0 flex-1">
                  <textarea
                    className="sk-input resize-y"
                    style={{ minHeight: 'var(--tap)', lineHeight: 1.5 }}
                    value={it.sentence}
                    rows={2}
                    onChange={(e) => editSentence(i, e.target.value)}
                  />
                  <p style={{ marginTop: 4, color: 'var(--c-gray)', fontSize: 'var(--fs-tiny)' }}>
                    {it.reason}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部按钮 */}
        {!loading && !error ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-5 pb-6 pt-2"
            style={{ borderTop: 'var(--bw) solid var(--c-ink)' }}
          >
            <div className="flex gap-3">
              <button
                type="button"
                className="sk-btn"
                style={{ minHeight: 'var(--tap)' }}
                onClick={findMore}
                disabled={moreLoading}
              >
                {moreLoading ? '找句子中…' : '再多找几句'}
              </button>
              <button
                type="button"
                className="sk-icon-btn"
                onClick={onTreatWhole}
                style={{ fontSize: 'var(--fs-small)' }}
              >
                整段当一句
              </button>
            </div>
            <button
              type="button"
              className="sk-btn-big"
              style={{ minHeight: 56, padding: '8px 24px', fontSize: 'var(--fs-base)' }}
              disabled={selectedCount === 0}
              onClick={() => onConfirm(items.filter((i) => i.checked).map((i) => i.sentence))}
            >
              拆这 {selectedCount} 句
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
