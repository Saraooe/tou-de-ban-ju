interface Props {
  onOpenSettings: () => void
  onOpenPractice: () => void
  totalCards: number
}

export function Header({ onOpenSettings, onOpenPractice, totalCards }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-semibold tracking-tight text-ink-900">偷得半句</span>
          <span className="hidden text-sm text-ink-500 sm:inline">· 把 TikTok 上的好句子偷回来</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-ink-500 sm:inline">
            共 <b className="font-semibold text-ink-700">{totalCards}</b> 张卡片
          </span>
          <button className="ink-btn-outline" onClick={onOpenPractice} title="今日练习">
            <span>🎯</span>
            <span className="hidden sm:inline">今日练习</span>
          </button>
          <button className="ink-btn-ghost" onClick={onOpenSettings} title="设置">
            <span>⚙</span>
            <span className="hidden sm:inline">设置</span>
          </button>
        </div>
      </div>
    </header>
  )
}
