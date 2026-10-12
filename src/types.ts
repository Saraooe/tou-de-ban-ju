// 核心数据模型与接口
// 设计原则：存储层接口与实现分离，未来可换 IndexedDB 或后端，UI 层无需改。

export interface Card {
  id: string
  original: string          // 原句
  sourceLink?: string       // 可选来源链接
  topic: string             // 主题
  skeleton: string          // 句型骨架，用 ___ 标出可替换位置
  scenarios: string[]       // 什么时候用（2-3 个场景描述）
  tone: string              // 语气/场合：口语 / 俚语 / 随意 / 偏正式 等
  avoid: string             // 哪些场合别用
  examples: string[]        // 3 个仿写句
  suggestedTopics?: string[]// AI 给出的建议主题
  useCount: number          // 被"我用上了"过的次数
  lastPracticedAt?: number  // 上次练习时间（毫秒时间戳）
  createdAt: number         // 创建时间
  updatedAt: number         // 最后修改时间
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
  getSettings(): Settings
  saveSettings(s: Settings): void
}
