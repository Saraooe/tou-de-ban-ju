// 文本预处理工具：粘贴的内容进来先过一遍这里

// 去掉 emoji、话题标签（#fyp 之类）、多余空白
export function stripNoise(s: string): string {
  return s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/#[A-Za-z0-9_]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

export function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

// 单句判定：英文单词数 ≤ 25 且句末标点（. ! ?）不超过 1 个。
// 超出即视为"大段"，走挑亮点流程。
export function isSingleSentence(s: string): boolean {
  const ends = (s.match(/[.!?]/g) ?? []).length
  return countWords(s) <= 25 && ends <= 1
}

// 原句标准化：用于重复检测（trim + 转小写 + 压缩多余空格）
export function normalizeOriginal(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}
