// 核心数据模型与接口
// 设计原则：存储层接口与实现分离，未来可换 IndexedDB 或后端，UI 层无需改。

export interface CardUsage {
  text: string   // 练习时写的回答
  at: number     // 时间戳
}

/** 练习结果三态：不是对错，是回忆难度 */
export type PracticeStatus = 'recalled' | 'hinted' | 'cant'

/** 每张卡片的累计练习统计（用于排序） */
export interface PracticeStats {
  recalled: number   // 主动想起次数
  hinted: number     // 依赖提示次数
  cant: number       // 暂时说不出次数
  lastStatus?: PracticeStatus
  lastAt?: number    // 上次任何一次练习的时间戳
}

export interface Card {
  id: string
  original: string          // 原句
  sourceLink?: string       // 可选来源链接
  topic: string             // 主题
  meaning: string           // 一句话中文释义（实际含义，不是逐字翻译）
  skeleton: string          // 句型骨架，用 ___ 标出可替换位置
  scenarios: string[]       // 什么时候用（2-3 个场景描述）
  tone: string              // 语气/场合：口语 / 俚语 / 随意 / 偏正式 等
  avoid: string             // 哪些场合别用
  examples: string[]        // 3 个仿写句
  sourceContext?: string    // 这句话所在的原段落（最多 600 字符），可选，旧数据没有也能用
  suggestedTopics?: string[]// AI 给出的建议主题
  usages?: CardUsage[]      // 练习记录（自己写的回答）
  useCount: number          // 被"我用上了"过的次数
  lastPracticedAt?: number  // 上次练习时间（毫秒时间戳）
  createdAt: number         // 创建时间
  updatedAt: number         // 最后修改时间
  // 下面三个是"练一句"功能用的字段，旧卡可以没有，由 UI 兜底
  recallHint?: string       // 中文回忆提示：想表达"我早就想去试试了"
  oralQuestion?: string     // 英文口语问题：Have you ever had something you've been meaning to try?
  practiceStats?: PracticeStats
}

export interface Settings {
  apiKey: string
  apiBase: string
  model: string
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  apiBase: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
}

// ---------- 存储抽象层 ----------
// UI 只跟这个接口打交道，不直接碰 localStorage。

export interface StorageAdapter {
  listCards(): Card[]
  getCard(id: string): Card | null
  saveCard(card: Card): void
  deleteCard(id: string): void
  replaceAllCards(cards: Card[]): void
  getSettings(): Settings
  saveSettings(s: Settings): void
  // "练一句"功能：练习会话独立存储，不污染卡片
  listPracticeSessions(): PracticeSession[]
  appendPracticeSessionItem(date: string, item: PracticeItem): void
  // 增量更新某张卡片的练习统计
  bumpPracticeStats(cardId: string, status: PracticeStatus, at: number): void
}

export interface PracticeItem {
  cardId: string
  status: PracticeStatus
  selfText?: string
  at: number
}

/** 一天一条会话，存所有练习项 */
export interface PracticeSession {
  date: string         // YYYY-MM-DD
  startedAt: number
  finishedAt?: number
  items: PracticeItem[]
}

// 备份文件结构（导出/导入用）
export interface BackupData {
  version: 1
  exportedAt: string
  cards: Card[]
  practiceSessions?: PracticeSession[]
}
