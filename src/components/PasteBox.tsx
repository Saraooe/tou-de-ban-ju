import { useEffect, useState } from 'react'
import type { Settings } from '@/types'
import { analyzeSentence, type AnalyzeResult } from '@/services/deepseek'
import { isSingleSentence, stripNoise } from '@/utils/text'
import { IconMore, IconHand } from './hand/HandIcon'

interface Props {
  onGenerate: (input: {
    original: string
    sourceLink: string
    hintTopic: string
    result: AnalyzeResult
    source: 'ai' | 'manual'
  }) => void
  // 大段内容：交给 App 打开「挑亮点」面板
  onStartHighlights: (input: {
    original: string
    sourceLink: string
    hintTopic: string
  }) => void
  onError: (msg: string) => void
  onNeedApiKey: () => void
  hasApiKey: boolean
  loading: boolean
  setLoading: (b: boolean) => void
  existingTopics: string[]
  settings: Settings
  // 变化时清空粘贴框（App 在队列全部保存完后触发；中途关面板不触发，原文保留）
  clearSignal: number
}

const EMPTY_RESULT: AnalyzeResult = {
  picked: '',
  corrected: '',
  meaning: '',
  skeleton: '',
  scenarios: [],
  tone: '',
  avoid: '',
  examples: [],
  suggestedTopics: [],
}

export function PasteBox({
  onGenerate,
  onStartHighlights,
  onError,
  onNeedApiKey,
  hasApiKey,
  loading,
  setLoading,
  existingTopics,
  settings,
  clearSignal,
}: Props) {
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [topic, setTopic] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (clearSignal > 0) {
      setText('')
      setLink('')
      setTopic('')
      setExpanded(false)
    }
  }, [clearSignal])

  function collectAndReset() {
    const input = {
      original: text.trim(),
      sourceLink: link.trim(),
      hintTopic: topic.trim(),
    }
    setText('')
    setLink('')
    setTopic('')
    setExpanded(false)
    return input
  }

  async function handleGenerate() {
    const raw = text.trim()
    if (!raw) {
      onError('先粘贴一句英文吧。')
      return
    }
    // 先去掉 emoji / #标签 再判断是单句还是大段
    const cleaned = stripNoise(raw)
    const single = isSingleSentence(cleaned)

    if (!hasApiKey) {
      onNeedApiKey()
      onError(
        single
          ? '未填写 API Key，请先在「设置」中粘贴 DeepSeek Key；也可以点「手动填写」自己填字段。'
          : '大段内容需要先填 API Key 才能让 AI 挑亮点；也可以点「手动填写」自己选一句填。',
      )
      return
    }

    if (!single) {
      // 大段：进入挑亮点流程。粘贴框先不清空——中途关掉面板，原文还在。
      onStartHighlights({ original: raw, sourceLink: link.trim(), hintTopic: topic.trim() })
      return
    }

    // 单句：保持原来的一步流程
    setLoading(true)
    try {
      const result = await analyzeSentence(raw, topic, existingTopics, settings)
      const input = collectAndReset()
      onGenerate({ ...input, result, source: 'ai' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      onError(`拆解失败：${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // 无 AI 也能用：直接开一张空白草稿，字段自己填
  function handleManual() {
    const original = text.trim()
    if (!original) {
      onError('先粘贴一句英文吧。')
      return
    }
    const input = collectAndReset()
    onGenerate({ ...input, result: { ...EMPTY_RESULT, picked: original, corrected: original }, source: 'manual' })
  }

  return (
    <div className="flex flex-1 flex-col justify-end pb-6">
      <div className="flex flex-col gap-3">
        <textarea
          className="sk-input resize-none"
          style={{ minHeight: 180, lineHeight: 1.6 }}
          placeholder="paste from tiktok…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {expanded && (
          <div className="flex flex-col gap-3">
            <input
              className="sk-input"
              placeholder="link (可选)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <input
              className="sk-input"
              placeholder="主题 (可选)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              list="paste-topics"
            />
            <datalist id="paste-topics">
              {existingTopics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        )}
        <div className="flex items-end justify-between gap-2">
          {/* 更多：收起来源链接 / 主题 */}
          <button
            type="button"
            className="sk-icon-btn flex-col"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? '收起来源和主题' : '加来源链接或主题'}
          >
            <IconMore size={22} />
            <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--c-gray)' }}>
              {expanded ? '收起' : '更多'}
            </span>
          </button>

          <div className="flex items-end gap-4">
            {/* 手填：不用 AI，自己填字段 */}
            <button
              type="button"
              className="sk-icon-btn flex-col"
              onClick={handleManual}
              disabled={loading || !text.trim()}
              aria-label="手动填写"
            >
              <IconHand size={24} />
              <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--c-gray)' }}>手填</span>
            </button>

            {/* 主按钮：偷 */}
            <button
              type="button"
              className="sk-btn-big"
              style={{ width: 128, height: 84 }}
              onClick={handleGenerate}
              disabled={loading || !text.trim()}
            >
              {loading ? '偷着…' : '偷'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
