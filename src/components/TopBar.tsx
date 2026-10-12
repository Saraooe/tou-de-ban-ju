interface Props {
  onGoHome: () => void
  onOpenMenu: () => void
}

/** 顶栏：左上小字站名（点回首页），右上实心黑点（开菜单） */
export function TopBar({ onGoHome, onOpenMenu }: Props) {
  return (
    <div className="flex items-center justify-between px-5 pt-4" style={{ minHeight: 56 }}>
      <button
        type="button"
        onClick={onGoHome}
        className="sk-icon-btn"
        style={{ fontSize: 'var(--fs-small)', minHeight: 'var(--tap)' }}
        aria-label="回首页"
      >
        偷得半句
      </button>
      <button
        type="button"
        onClick={onOpenMenu}
        className="sk-icon-btn"
        aria-label="菜单"
      >
        <span
          className="sketch-circle inline-block"
          style={{
            width: 18,
            height: 18,
            background: 'var(--c-ink)',
            borderColor: 'var(--c-ink)',
          }}
        />
      </button>
    </div>
  )
}
