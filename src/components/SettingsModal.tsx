import { useEffect, useState } from 'react'
import type { Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

interface Props {
  open: boolean
  initial: Settings
  onClose: () => void
  onSave: (s: Settings) => void
}

export function SettingsModal({ open, initial, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Settings>(initial)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (open) setDraft(initial)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-ink-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink-900">设置</h2>
        <p className="mt-1 text-sm text-ink-500">
          所有内容只保存在你这台电脑的浏览器里（localStorage），不会上传到任何服务器。
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="ink-label">DeepSeek API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                className="ink-input font-mono"
                value={draft.apiKey}
                placeholder="sk-..."
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              />
              <button
                type="button"
                className="ink-btn-outline shrink-0"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              没填时也可以保存卡片，只是「句型拆解」要靠你手填。
            </p>
          </div>

          <div>
            <label className="ink-label">API Base URL</label>
            <input
              className="ink-input font-mono"
              value={draft.apiBase}
              onChange={(e) => setDraft({ ...draft, apiBase: e.target.value })}
            />
          </div>

          <div>
            <label className="ink-label">模型</label>
            <input
              className="ink-input font-mono"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            className="text-xs text-ink-500 hover:text-ink-700"
            onClick={() => setDraft(DEFAULT_SETTINGS)}
          >
            恢复默认
          </button>
          <div className="flex gap-2">
            <button className="ink-btn-ghost" onClick={onClose}>
              取消
            </button>
            <button
              className="ink-btn-primary"
              onClick={() => {
                onSave(draft)
                onClose()
              }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
