import { useEffect } from 'react'
import { IconClose } from './hand/HandIcon'

interface Props {
  open: boolean
  onClose: () => void
  onOpenLibrary: () => void
  onOpenBackup: () => void
  onOpenSettings: () => void
}

/** 右上黑点点开的全屏菜单：三项大字 */
export function MenuOverlay({ open, onClose, onOpenLibrary, onOpenBackup, onOpenSettings }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const items: Array<{ label: string; action: () => void }> = [
    { label: '句子库', action: onOpenLibrary },
    { label: '备份', action: onOpenBackup },
    { label: '设置', action: onOpenSettings },
  ]

  return (
    <div className="sk-overlay">
      <div className="flex items-center justify-between px-5 pt-4">
        <span style={{ color: 'var(--c-gray)', fontSize: 'var(--fs-small)' }}>菜单</span>
        <button type="button" className="sk-icon-btn" onClick={onClose} aria-label="关掉菜单">
          <IconClose size={22} />
        </button>
      </div>
      <nav className="sk-page items-start justify-center gap-8" style={{ paddingTop: '18vh' }}>
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            className="sk-icon-btn"
            style={{ fontSize: 30, minHeight: 56 }}
            onClick={() => {
              onClose()
              it.action()
            }}
          >
            {it.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
