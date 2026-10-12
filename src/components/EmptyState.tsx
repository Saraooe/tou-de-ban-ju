interface Props {
  title: string
  description?: string
  icon?: string
}

export function EmptyState({ title, description, icon = '✦' }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-2xl text-ink-400">
        {icon}
      </div>
      <h3 className="text-base font-medium text-ink-800">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p> : null}
    </div>
  )
}
