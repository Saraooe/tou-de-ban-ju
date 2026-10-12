import { useEffect, useMemo, useState } from 'react'
import type { Card, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { storage } from '@/storage/localStorageAdapter'
import { Header } from '@/components/Header'
import { PasteBox } from '@/components/PasteBox'
import { CardList } from '@/components/CardList'
import {
  CardDetail,
  makeCardFromDraft,
  type DraftPayload,
} from '@/components/CardDetail'
import { PracticeView } from '@/components/PracticeView'
import { SettingsModal } from '@/components/SettingsModal'
import { useToast } from '@/components/ConfirmDialog'

export default function App() {
  // 数据
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  // UI 状态
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPayload | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { show, node } = useToast()

  // 首次加载：从 localStorage 读
  useEffect(() => {
    setCards(storage.listCards())
    const s = storage.getSettings()
    setSettings({ ...DEFAULT_SETTINGS, ...s })
    setHydrated(true)
  }, [])

  // 第一次打开时，若 settings 还没有 key，就用 PRD 提供的 deepseek key 作默认值（用户可自行在设置里改）
  useEffect(() => {
    if (!hydrated) return
    if (!settings.apiKey) {
      const seeded: Settings = { ...settings, apiKey: 'sk-5df64dab0cbf479bb0628affd85a4218' }
      setSettings(seeded)
      storage.saveSettings(seeded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  // 选中卡片
  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  )

  // 已知主题（用于输入提示）
  const knownTopics = useMemo(() => {
    const set = new Set<string>()
    for (const c of cards) {
      const t = c.topic?.trim()
      if (t) set.add(t)
    }
    return Array.from(set).sort()
  }, [cards])

  // ---------- 操作 ----------

  function handleGenerate(input: {
    original: string
    sourceLink: string
    hintTopic: string
    result: import('@/services/deepseek').AnalyzeResult
  }) {
    if (input.result.error) {
      show(`AI 没接住：${input.result.error}`)
      return
    }
    // 如果 AI 修正了转写，自动用修正后的版本作为原句
    const finalOriginal =
      input.result.corrected && input.result.corrected !== input.original
        ? input.result.corrected
        : input.result.picked || input.original
    const wasFixed = finalOriginal !== input.original
    setDraft({
      original: finalOriginal,
      sourceLink: input.sourceLink,
      topic: input.hintTopic || (input.result.suggestedTopics[0] ?? ''),
      meaning: input.result.meaning,
      skeleton: input.result.skeleton,
      scenarios: input.result.scenarios,
      tone: input.result.tone,
      avoid: input.result.avoid,
      examples: input.result.examples,
      suggestedTopics: input.result.suggestedTopics,
    })
    show(wasFixed ? 'AI 拆解完成，原句已自动修正。' : 'AI 拆解完成，可以再调一调然后保存。')
  }

  function handleChangeDraft(next: DraftPayload) {
    setDraft(next)
  }

  function handleSaveDraft() {
    if (!draft) return
    const card = makeCardFromDraft(draft)
    storage.saveCard(card)
    setCards((prev) => [card, ...prev])
    setDraft(null)
    setSelectedCardId(card.id)
    setSelectedTopic(null)
    show('已保存到句子库。')
  }

  function handleCancelDraft() {
    setDraft(null)
  }

  function handleSaveExisting(card: Card) {
    storage.saveCard(card)
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)))
    show('已保存。')
  }

  function handleDelete(id: string) {
    storage.deleteCard(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
    if (selectedCardId === id) setSelectedCardId(null)
    show('已删除。')
  }

  function handleMark(cardId: string) {
    const c = cards.find((x) => x.id === cardId)
    if (!c) return
    const updated: Card = {
      ...c,
      useCount: c.useCount + 1,
      lastPracticedAt: Date.now(),
    }
    storage.saveCard(updated)
    setCards((prev) => prev.map((x) => (x.id === cardId ? updated : x)))
  }

  function handleSaveSettings(s: Settings) {
    setSettings(s)
    storage.saveSettings(s)
    show('设置已保存。')
  }

  function handleError(msg: string) {
    show(msg)
  }

  // 移动端：选中卡片时切到「详情」视图
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  useEffect(() => {
    if (selectedCardId || draft) setMobileView('detail')
  }, [selectedCardId, draft])
  function goBackToList() {
    setSelectedCardId(null)
    setDraft(null)
    setMobileView('list')
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-ink-50">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPractice={() => setPracticeOpen(true)}
        totalCards={cards.length}
      />

      <PasteBox
        onGenerate={handleGenerate}
        onError={handleError}
        onNeedApiKey={() => setSettingsOpen(true)}
        hasApiKey={!!settings.apiKey}
        loading={loadingAI}
        setLoading={setLoadingAI}
        existingTopics={knownTopics}
      />

      {/* 桌面三栏 / 移动端单栏 */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-0 sm:px-4 sm:py-4">
        <div className="grid h-full min-h-[60vh] grid-cols-1 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card sm:min-h-[70vh] lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,24rem)]">
          {/* 移动端：始终显示列表视图，但用 mobileView 切换显示哪个 */}
          <div className={`${mobileView === 'list' ? 'block' : 'hidden'} lg:block`}>
            <CardList
              cards={cards}
              selectedTopic={selectedTopic}
              onSelect={setSelectedTopic}
              selectedCardId={selectedCardId}
              onSelectCard={setSelectedCardId}
              searchQuery={search}
              onSearchChange={setSearch}
            />
          </div>
          {/* 右侧详情栏：lg 始终显示；移动端按 mobileView */}
          <div
            className={`${mobileView === 'detail' ? 'block' : 'hidden'} lg:col-span-1 lg:block`}
          >
            <div className="flex h-full min-h-[60vh] flex-col">
              <div className="border-b border-ink-200 px-3 py-2 lg:hidden">
                <button className="ink-btn-ghost text-xs" onClick={goBackToList}>
                  ← 返回列表
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <CardDetail
                  selected={selectedCard}
                  draft={draft}
                  onChangeDraft={handleChangeDraft}
                  onSaveDraft={handleSaveDraft}
                  onCancelDraft={handleCancelDraft}
                  onSaveExisting={handleSaveExisting}
                  onDelete={handleDelete}
                  onClose={goBackToList}
                  knownTopics={knownTopics}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-6 px-4 pb-6 text-center text-xs text-ink-400">
        偷得半句 · 数据只保存在你这台电脑的浏览器里（localStorage）
      </footer>

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <PracticeView
        open={practiceOpen}
        cards={cards}
        onClose={() => setPracticeOpen(false)}
        onMark={handleMark}
      />

      {node}
    </div>
  )
}
