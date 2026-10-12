import { IconCircle, IconSmile } from './HandIcon'

/**
 * 手绘圆圈勾选：点一下空心圆变笑脸。
 * used=true 时不能再点（今天已经用上了）。
 */
export function HandCheck({
  used,
  onToggle,
  disabled,
  size = 30,
  label,
}: {
  used: boolean
  onToggle: () => void
  disabled?: boolean
  size?: number
  label: string
}) {
  return (
    <button
      type="button"
      onClick={used || disabled ? undefined : onToggle}
      disabled={disabled}
      className="sk-icon-btn shrink-0"
      style={{ color: used ? 'var(--c-ink)' : undefined }}
      aria-label={label}
      aria-pressed={used}
    >
      {used ? <IconSmile size={size} /> : <IconCircle size={size} />}
    </button>
  )
}
