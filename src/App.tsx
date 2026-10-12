import { useEffect, useMemo, useRef, useState } from 'react'
import type { Card, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'
import { storage } from '@/storage/localStorageAdapter'
import { analyzeSentence, type AnalyzeResult } from '@/services/deepseek'
import { normalizeOriginal, stripNoise } from '@/utils/text'
import { PasteBox } from '@/components/PasteBox'
import { CardList } from '@/components/CardList'
import {
  CardDetail,
  makeCardFromDraft,
  type DraftPayload,
  type DraftQueueInfo,
} from '@/components/CardDetail'
import { HighlightPicker } from '@/components/HighlightPicker'
import { HomePage } from '@/components/HomePage'
import { TopBar } from '@/components/TopBar'
import { MenuOverlay } from '@/components/MenuOverlay'
import { IconArrowLeft } from '@/components/hand/HandIcon'
import { SettingsModal } from '@/components/SettingsModal'
import { BackupModal } from '@/components/BackupModal'
import { useToast } from '@/components/ConfirmDialog'

const MAX_PASSAGE = 4000

// 待保存队列里的一项
interface QueueItem {
  draft: DraftPayload | null // 拆解完成前是 null
  status: 'loading' | 'ready' | 'failed'
  error?: string
  // 拆解用的原始信息（重试时需要）
  src: { original: string; link: string; hintTopic: string; context: string }
}

function buildDraft(src: QueueItem['src'], res: AnalyzeResult): DraftPayload {
  // 如果 AI 修正了转写，用修正后的版本作为原句
  const finalOriginal =
    res.corrected && res.corrected !== src.original ? res.corrected : res.picked || src.original
  return {
    original: finalOriginal,
    sourceLink: src.link,
    topic: src.hintTopic || res.suggestedTopics[0] || '',
    meaning: res.meaning,
    skeleton: res.skeleton,
    scenarios: res.scenarios,
    tone: res.tone,
    avoid: res.avoid,
    examples: res.examples,
    suggestedTopics: res.suggestedTopics,
    sourceContext: src.context,
  }
}

// 拆解失败时的兜底草稿：至少有原句，字段可以手动填
function fallbackDraft(src: QueueItem['src']): DraftPayload {
  return {
    original: src.original,
    sourceLink: src.link,
    topic: src.hintTopic || '',
    meaning: '',
    skeleton: src.original,
    scenarios: [],
    tone: '',
    avoid: '',
    examples: [],
    sourceContext: src.context,
  }
}

// 挑亮点面板需要的状态
interface PickerState {
  passage: string
  truncated: boolean
  link: string
  hintTopic: string
}

export default function App() {
  // 数据
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  // UI 状态
  const [page, setPage] = useState<'home' | 'steal' | 'library'>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [singleDraft, setSingleDraft] = useState<DraftPayload | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [search, setSearch] = useState('')

  // 大段拆解：挑亮点面板 + 待保存队列
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  // 触发 PasteBox 清空粘贴框（队列全部保存完后）
  const [pasteClear, setPasteClear] = useState(0)
  // 重复句子弹窗
  const [dupDialog, setDupDialog] = useState<{ cardId: string } | null>(null)

  const { show, node } = useToast()

  // 首次加载：从 localStorage 读
  useEffect(() => {
    setCards(storage.listCards())
    setSettings({ ...DEFAULT_SETTINGS, ...storage.getSettings() })
  }, [])

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

  const inQueue = queueItems.length > 0
  const currentItem = queueItems[queueIndex] ?? null
  // 队列模式下显示当前项的草稿；否则显示单张草稿
  const draft: DraftPayload | null = inQueue ? (currentItem?.draft ?? null) : singleDraft

  // 异步回调里读最新状态用
  const queueRef = useRef(queueItems)
  queueRef.current = queueItems
  const knownTopicsRef = useRef(knownTopics)
  knownTopicsRef.current = knownTopics

  // ---------- 单句流程（原有逻辑） ----------

  function handleGenerate(input: {
    original: string
    sourceLink: string
    hintTopic: string
    result: AnalyzeResult
    source: 'ai' | 'manual'
  }) {
    setQueueItems([])
    setQueueIndex(0)
    if (input.result.error) {
      show(`AI 没接住：${input.result.error}`)
      return
    }
    const finalOriginal =
      input.source === 'manual'
        ? input.original
        : input.result.corrected && input.result.corrected !== input.original
          ? input.result.corrected
          : input.result.picked || input.original
    const wasFixed = finalOriginal !== input.original
    setSingleDraft({
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
    if (input.source === 'manual') {
      show('已打开空白草稿，自己把字段填一填。')
    } else {
      show(wasFixed ? 'AI 拆解完成，原句已自动修正。' : 'AI 拆解完成，可以再调一调然后保存。')
    }
  }

  function handleChangeDraft(next: DraftPayload) {
    if (inQueue) {
      setQueueItems((q) => q.map((it, i) => (i === queueIndex ? { ...it, draft: next } : it)))
    } else {
      setSingleDraft(next)
    }
  }

  function saveSingleDraft(force: boolean) {
    if (!singleDraft) return
    if (!force) {
      const dup = findDuplicate(singleDraft.original, cards)
      if (dup) {
        setDupDialog({ cardId: dup.id })
        return
      }
    }
    const card = makeCardFromDraft({ ...singleDraft, topic: singleDraft.topic.trim() })
    storage.saveCard(card)
    setCards((prev) => [card, ...prev])
    setSingleDraft(null)
    setSelectedCardId(card.id)
    setSelectedTopic(null)
    show('偷到了。')
  }

  function handleSaveDraft() {
    if (inQueue) {
      saveQueueItemCurrent(false)
      return
    }
    saveSingleDraft(false)
  }

  function handleCancelDraft() {
    setSingleDraft(null)
  }

  function handleSaveExisting(card: Card) {
    storage.saveCard(card)
    setCards((prev) => prev.map((c) => (c.id === card.id ? card : c)))
    show('已保存。')
  }

  function handleDelete(id: string) {
    storage.deleteCard(id)
    setCards((prev) => prev.filter((c) => c.id !== id))
    if (selectedCardId === id) {
      setSelectedCardId(null)
    }
    show('扔了。')
  }

  function handleMark(cardId: string, text: string) {
    const c = cards.find((x) => x.id === cardId)
    if (!c) return
    const updated: Card = {
      ...c,
      useCount: c.useCount + 1,
      lastPracticedAt: Date.now(),
      usages: [...(c.usages ?? []), { text: text.trim(), at: Date.now() }],
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

  // ---------- 大段拆解：挑亮点 → 待保存队列 ----------

  function handleStartHighlights(input: {
    original: string
    sourceLink: string
    hintTopic: string
  }) {
    const cleaned = stripNoise(input.original)
    const truncated = cleaned.length > MAX_PASSAGE
    const passage = truncated ? cleaned.slice(0, MAX_PASSAGE) : cleaned
    if (truncated) show('内容较长，只分析了前 4000 字符。')
    setPicker({ passage, truncated, link: input.sourceLink, hintTopic: input.hintTopic })
  }

  function handleHighlightConfirm(sentences: string[]) {
    const p = picker
    if (!p) return
    setPicker(null)
    setSingleDraft(null)
    setSelectedCardId(null)
    const items: QueueItem[] = sentences.map((s) => ({
      draft: null,
      status: 'loading',
      src: {
        original: s,
        link: p.link,
        hintTopic: p.hintTopic,
        context: p.passage.slice(0, 600),
      },
    }))
    setQueueItems(items)
    setQueueIndex(0)
    queueRef.current = items // 同步更新 ref：analyzePool 里异步读的是 ref，不等 React 重渲染
    show(`AI 正在拆解 ${sentences.length} 句，拆好一张看一张。`)
    void analyzePool(items.length)
  }

  // 整段当一句处理：关掉面板，走原有单句流程
  async function handleTreatWhole() {
    const p = picker
    if (!p) return
    setPicker(null)
    setLoadingAI(true)
    try {
      const result = await analyzeSentence(
        p.passage,
        p.hintTopic || undefined,
        knownTopics,
        settings,
      )
      setPasteClear((n) => n + 1)
      handleGenerate({
        original: p.passage,
        sourceLink: p.link,
        hintTopic: p.hintTopic,
        result,
        source: 'ai',
      })
    } catch (e) {
      show(`拆解失败：${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setLoadingAI(false)
    }
  }

  // 拆解队列里的某一句（失败不抛出，标在队列项上）
  async function analyzeQueueItem(i: number) {
    const item = queueRef.current[i]
    if (!item) return
    setQueueItems((q) =>
      q.map((it, idx) => (idx === i ? { ...it, status: 'loading', error: undefined } : it)),
    )
    try {
      const res = await analyzeSentence(
        item.src.original,
        item.src.hintTopic || undefined,
        knownTopicsRef.current,
        settings,
        item.src.context,
      )
      setQueueItems((q) =>
        q.map((it, idx) => {
          if (idx !== i) return it
          if (res.error) {
            return {
              ...it,
              status: 'failed',
              error: `AI 没接住：${res.error}`,
              draft: it.draft ?? fallbackDraft(it.src),
            }
          }
          return { ...it, status: 'ready', draft: buildDraft(it.src, res), error: undefined }
        }),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      setQueueItems((q) =>
        q.map((it, idx) =>
          idx === i
            ? { ...it, status: 'failed', error: msg, draft: it.draft ?? fallbackDraft(it.src) }
            : it,
        ),
      )
    }
  }

  // 并发拆解，同时最多 3 个
  async function analyzePool(total: number) {
    let next = 0
    const worker = async () => {
      while (next < total) {
        const i = next++
        await analyzeQueueItem(i)
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, total) }, worker))
  }

  // 队列里移除某一项后调整索引
  function removeQueueItem(i: number) {
    const rest = queueItems.filter((_, idx) => idx !== i)
    setQueueItems(rest)
    const maxIdx = rest.length - 1
    setQueueIndex((cur) => (cur > maxIdx ? Math.max(0, maxIdx) : cur))
    return rest
  }

  function saveQueueItemCurrent(force: boolean) {
    const item = queueItems[queueIndex]
    if (!item || !item.draft) return
    if (!force) {
      const dup = findDuplicate(item.draft.original, cards)
      if (dup) {
        setDupDialog({ cardId: dup.id })
        return
      }
    }
    const card = makeCardFromDraft({ ...item.draft, topic: item.draft.topic.trim() })
    storage.saveCard(card)
    setCards((prev) => [card, ...prev])
    const rest = removeQueueItem(queueIndex)
    if (rest.length === 0) {
      setSelectedCardId(card.id)
      setSelectedTopic(null)
      setPasteClear((n) => n + 1)
      show('偷到了，这一批全处理完了。')
    } else {
      show('偷到了。')
    }
  }

  function handleSkipQueueItem() {
    const rest = removeQueueItem(queueIndex)
    if (rest.length === 0) show('这一批都处理完了。')
  }

  function handleSaveAllQueue() {
    if (!inQueue) return
    let saved = 0
    let dupSkipped = 0
    let pending = 0
    const newCards: Card[] = []
    for (const it of queueItems) {
      if (it.status === 'loading' || !it.draft) {
        pending++
        continue
      }
      if (findDuplicate(it.draft.original, cards.concat(newCards))) {
        dupSkipped++
        continue
      }
      const card = makeCardFromDraft({ ...it.draft, topic: it.draft.topic.trim() })
      storage.saveCard(card)
      newCards.push(card)
      saved++
    }
    if (newCards.length > 0) {
      setCards((prev) => [...newCards.slice().reverse(), ...prev])
    }
    if (pending > 0 && saved === 0) {
      show(`还有 ${pending} 句在拆解中，等它们好了再保存。`)
      return
    }
    const lastSaved = newCards[newCards.length - 1]
    if (pending > 0) {
      // 还有几句在拆：只移走已处理的部分，保留还在拆解的
      setQueueItems((q) => q.filter((it) => it.status === 'loading'))
      setQueueIndex(0)
    } else {
      setQueueItems([])
      setQueueIndex(0)
      if (lastSaved) {
        setSelectedCardId(lastSaved.id)
        setSelectedTopic(null)
      }
      setPasteClear((n) => n + 1)
    }
    show(
      saved === 0 && dupSkipped > 0
        ? '都偷过了，没有新卡片。'
        : `偷到了。${saved} 张入库${dupSkipped > 0 ? `，跳过已存在的 ${dupSkipped} 句` : ''}。`,
    )
  }

  function handleDiscardQueue() {
    setQueueItems([])
    setQueueIndex(0)
    show('这一批草稿已丢弃，粘贴框里的原文还在。')
  }

  // ---------- 重复句子弹窗 ----------

  function findDuplicate(original: string, pool: Card[]): Card | null {
    const norm = normalizeOriginal(original)
    return pool.find((c) => normalizeOriginal(c.original) === norm) ?? null
  }

  function handleDupView() {
    const dup = cards.find((c) => c.id === dupDialog?.cardId)
    setDupDialog(null)
    if (!dup) return
    if (inQueue) {
      const rest = removeQueueItem(queueIndex)
      if (rest.length === 0) setPasteClear((n) => n + 1)
    } else {
      setSingleDraft(null)
    }
    setSelectedTopic(null)
    setSelectedCardId(dup.id)
    show('跳到那张卡片了。')
  }

  function handleDupForceSave() {
    setDupDialog(null)
    if (inQueue) {
      saveQueueItemCurrent(true)
      return
    }
    saveSingleDraft(true)
  }

  // 队列信息（传给 CardDetail 的导航栏）
  const queueInfo: DraftQueueInfo | null = inQueue
    ? {
        index: queueIndex,
        total: queueItems.length,
        status: currentItem?.status ?? 'loading',
        error: currentItem?.error,
        pendingCount: queueItems.filter((q) => q.status === 'loading').length,
        onPrev: () => setQueueIndex((i) => Math.max(0, i - 1)),
        onNext: () => setQueueIndex((i) => Math.min(queueItems.length - 1, i + 1)),
        onSkip: handleSkipQueueItem,
        onSaveAll: handleSaveAllQueue,
        onRetry: () => {
          void analyzeQueueItem(queueIndex)
        },
        onDiscard: handleDiscardQueue,
      }
    : null

  // 有草稿/队列/选中卡片时，整页切到详情视图
  const showingDetail = !!singleDraft || inQueue || !!selectedCardId
  function closeDetail() {
    if (inQueue) {
      handleDiscardQueue() // 未保存的草稿不保留，粘贴框原文还在
      return
    }
    if (singleDraft) {
      handleCancelDraft()
      return
    }
    setSelectedCardId(null)
  }

  return (
    <div className="flex h-full min-h-screen flex-col" style={{ background: 'var(--c-paper)' }}>
      <TopBar onGoHome={() => setPage('home')} onOpenMenu={() => setMenuOpen(true)} />

      {/* ---------- 详情视图：草稿 / 队列 / 选中卡片 ---------- */}
      {showingDetail ? (
        <div className="sk-page">
          <div className="flex items-center py-1">
            <button type="button" className="sk-icon-btn" onClick={closeDetail} aria-label="返回">
              <IconArrowLeft size={22} />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <CardDetail
              selected={selectedCard}
              draft={draft}
              queue={queueInfo}
              onChangeDraft={handleChangeDraft}
              onSaveDraft={handleSaveDraft}
              onCancelDraft={handleCancelDraft}
              onSaveExisting={handleSaveExisting}
              onDelete={handleDelete}
              onClose={closeDetail}
              knownTopics={knownTopics}
            />
          </div>
        </div>
      ) : page === 'home' ? (
        /* ---------- 首页：今日一句 ---------- */
        <HomePage
          cards={cards}
          onMark={handleMark}
          onGoSteal={() => setPage('steal')}
          onOpenCard={(id) => {
            setSelectedTopic(null)
            setSelectedCardId(id)
          }}
        />
      ) : page === 'steal' ? (
        /* ---------- 偷页 ---------- */
        <div className="sk-page">
          <div className="flex items-center py-1">
            <button
              type="button"
              className="sk-icon-btn"
              onClick={() => setPage('home')}
              aria-label="回首页"
            >
              <IconArrowLeft size={22} />
            </button>
          </div>
          <PasteBox
            onGenerate={handleGenerate}
            onStartHighlights={handleStartHighlights}
            onError={handleError}
            onNeedApiKey={() => setSettingsOpen(true)}
            hasApiKey={!!settings.apiKey}
            loading={loadingAI}
            setLoading={setLoadingAI}
            existingTopics={knownTopics}
            settings={settings}
            clearSignal={pasteClear}
          />
        </div>
      ) : (
        /* ---------- 句子库（这一轮先保留旧布局，下一轮再改） ---------- */
        <main className="mx-auto w-full max-w-[480px] flex-1 px-0 sm:px-3 sm:py-3">
          <div className="h-full min-h-[60vh] overflow-hidden bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:border lg:border-ink-200">
            <CardList
              cards={cards}
              selectedTopic={selectedTopic}
              onSelect={setSelectedTopic}
              selectedCardId={selectedCardId}
              onSelectCard={(id) => setSelectedCardId(id)}
              searchQuery={search}
              onSearchChange={setSearch}
            />
            <div className="hidden lg:block">
              <div className="flex h-full min-h-[60vh] flex-col">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <CardDetail
                    selected={selectedCard}
                    draft={draft}
                    queue={queueInfo}
                    onChangeDraft={handleChangeDraft}
                    onSaveDraft={handleSaveDraft}
                    onCancelDraft={handleCancelDraft}
                    onSaveExisting={handleSaveExisting}
                    onDelete={handleDelete}
                    onClose={() => setSelectedCardId(null)}
                    knownTopics={knownTopics}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 挑亮点面板 */}
      <HighlightPicker
        open={!!picker}
        passage={picker?.passage ?? ''}
        truncated={picker?.truncated ?? false}
        settings={settings}
        onClose={() => setPicker(null)}
        onConfirm={handleHighlightConfirm}
        onTreatWhole={() => {
          void handleTreatWhole()
        }}
        onNotify={show}
      />

      {/* 重复句子弹窗 */}
      {dupDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(17,17,17,0.3)' }} onClick={() => setDupDialog(null)} />
          <div className="sketch relative w-full max-w-sm p-6">
            <h3 style={{ fontSize: 'var(--fs-big)' }}>这句已经存过了</h3>
            <p className="mt-2" style={{ fontSize: 'var(--fs-small)', color: 'var(--c-gray)' }}>
              句子库里已有一句一模一样的原句。
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button className="sk-btn" onClick={() => setDupDialog(null)}>
                继续编辑
              </button>
              <button className="sk-btn" onClick={handleDupView}>
                查看已有卡片
              </button>
              <button className="sk-btn sk-btn-solid" onClick={handleDupForceSave}>
                仍然保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MenuOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenLibrary={() => setPage('library')}
        onOpenBackup={() => setBackupOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <BackupModal
        open={backupOpen}
        cards={cards}
        onClose={() => setBackupOpen(false)}
        onImport={(merged, stats) => {
          storage.replaceAllCards(merged)
          setCards(merged)
          show(`导入完成：新增 ${stats.added} 张，更新 ${stats.updated} 张。`)
        }}
        onError={handleError}
      />

      {node}
    </div>
  )
}
