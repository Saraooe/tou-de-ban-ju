import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        <p className="mt-2 text-sm text-ink-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="ink-btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={danger ? 'ink-btn-primary bg-red-600 hover:bg-red-700' : 'ink-btn-primary'}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// 简单 toast（用于"已保存"等反馈，3 秒自动消失）
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  function show(text: string) {
    setMsg(text)
    window.setTimeout(() => setMsg((m) => (m === text ? null : m)), 2200)
  }
  const node = msg ? (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-sm text-white shadow-lg">
      {msg}
    </div>
  ) : null
  return { show, node }
}
