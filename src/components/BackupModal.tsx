import { useRef } from 'react'
import type { BackupData, Card } from '@/types'

interface Props {
  open: boolean
  cards: Card[]
  onClose: () => void
  // 合并已在模态内完成，上层只负责持久化合并结果
  onImport: (merged: Card[], stats: { added: number; updated: number }) => void
  onError: (msg: string) => void
}

export function BackupModal({ open, cards, onClose, onImport, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function handleExport() {
    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      cards,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tou-de-ban-ju-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // 允许重复选择同一个文件
    file
      .text()
      .then((raw) => {
        const parsed = JSON.parse(raw) as Partial<BackupData>
        if (!parsed || !Array.isArray(parsed.cards)) {
          throw new Error('文件里没有 cards 数组，不是有效的备份文件')
        }
        const { merged, added, updated } = mergeCards(parsed.cards)
        onImport(merged, { added, updated })
        onClose()
      })
      .catch((err) => {
        onError(`导入失败：${err instanceof Error ? err.message : '文件解析出错'}`)
      })
  }

  function mergeCards(incoming: Card[]): { merged: Card[]; added: number; updated: number } {
    const byId = new Map<string, Card>()
    for (const c of incoming) {
      if (!c || typeof c !== 'object' || !c.id) continue
      const prev = byId.get(c.id)
      if (!prev || (c.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) byId.set(c.id, c)
    }
    let added = 0
    let updated = 0
    const currentById = new Map(cards.map((c) => [c.id, c]))
    for (const c of byId.values()) {
      const cur = currentById.get(c.id)
      if (!cur) {
        added++
      } else if ((c.updatedAt ?? 0) >= (cur.updatedAt ?? 0)) {
        updated++
      } else {
        byId.set(c.id, cur) // 本地的更新，保留本地的
      }
    }
    // 合并结果：本地在前，新导入的在后
    const merged = [...cards.filter((c) => byId.has(c.id)).map((c) => byId.get(c.id)!),
      ...Array.from(byId.values()).filter((c) => !currentById.has(c.id))]
    return { merged, added, updated }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink-900">备份</h2>
        <p className="mt-1 text-sm text-ink-500">
          数据存在浏览器 localStorage 里，清浏览器数据就没了。导出一个 JSON 文件存到别处最稳。
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-ink-200 p-4">
            <h3 className="text-sm font-semibold text-ink-900">导出（{cards.length} 张卡片）</h3>
            <p className="mt-1 text-xs text-ink-500">
              下载为 JSON 文件。不含 API Key，换设备后需在「设置」里重新填。
            </p>
            <button className="ink-btn-outline mt-3 w-full" onClick={handleExport}>
              导出 JSON 文件
            </button>
          </div>

          <div className="rounded-xl border border-ink-200 p-4">
            <h3 className="text-sm font-semibold text-ink-900">导入</h3>
            <p className="mt-1 text-xs text-ink-500">
              同 id 的卡片按「修改时间新的」为准合并，不会丢数据。
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              className="ink-btn-outline mt-3 w-full"
              onClick={() => fileRef.current?.click()}
            >
              选择备份文件…
            </button>
          </div>
        </div>

        <div className="mt-5 text-right">
          <button className="ink-btn-ghost" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
