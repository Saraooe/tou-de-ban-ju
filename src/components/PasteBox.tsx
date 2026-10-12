import { useState } from 'react'
import type { AnalyzeResult } from '@/services/deepseek'

interface Props {
  onGenerate: (input: {
    original: string
    sourceLink: string
    hintTopic: string
    result: AnalyzeResult
  }) => void
  onError: (msg: string) => void
  onNeedApiKey: () => void
  hasApiKey: boolean
  loading: boolean
  setLoading: (b: boolean) => void
}

export function PasteBox({
  onGenerate,
  onError,
  onNeedApiKey,
  hasApiKey,
  loading,
  setLoading,
}: Props) {
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [topic, setTopic] = useState('')
  const [expanded, setExpanded] = useState(false)

  async function handleGenerate() {
    const original = text.trim()
    if (!original) {
      onError('先粘贴一句英文吧。')
      return
    }
    if (!hasApiKey) {
      onNeedApiKey()
      onError('未填写 API Key，请先在「设置」中粘贴 DeepSeek Key；或者直接点「保存」自己填字段。')
      return
    }
    setLoading(true)
    try {
      const { analyzeSentence } = await import('@/services/deepseek')
      const { storage } = await import('@/storage/localStorageAdapter')
      const settings = storage.getSettings()
      const result = await analyzeSentence(original, topic, settings)
      onGenerate({ original, sourceLink: link.trim(), hintTopic: topic.trim(), result })
      // 清空粘贴框
      setText('')
      setLink('')
      setTopic('')
      setExpanded(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      onError(`拆解失败：${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="border-b border-ink-200 bg-gradient-to-b from-white to-ink-50/60">
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-2">
          <label className="ink-label flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            粘贴新句子
          </label>
          <textarea
            className="ink-input min-h-[64px] resize-y font-serif text-base"
            placeholder="粘贴你在 TikTok 看到的句子或字幕…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setExpanded(true)}
          />
          {expanded && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                className="ink-input"
                placeholder="来源链接（可选）"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <input
                className="ink-input"
                placeholder="主题（可选，AI 也会给建议）"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs text-ink-500 hover:text-ink-700"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? '收起附加字段' : '添加来源链接 / 主题'}
            </button>
            <button
              type="button"
              className="ink-btn-primary"
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  AI 拆解中…
                </>
              ) : (
                <>生成卡片</>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
