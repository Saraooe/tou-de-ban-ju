import type { Settings } from '@/types'

// 调用大模型把一句英文拆成结构化字段。
// 返回的字段是「草案」，用户保存前仍可手改。

export interface AnalyzeResult {
  picked: string              // AI 实际拆解的那一句（多句时只取一句）
  corrected: string           // 修正转写错误之后的版本
  meaning: string             // 一句话中文释义（实际含义，不是逐字翻译）
  skeleton: string            // 句型骨架，用 ___ 标出可替换部分；兜底为 corrected
  scenarios: string[]         // 什么时候用（2-3 个）
  tone: string                // 语气/场合
  avoid: string               // 哪些场合别用
  examples: string[]          // 3 个仿写句
  suggestedTopics: string[]   // 建议主题，优先复用已有主题
  error?: string              // 输入无法拆解时，存错误原因
}

const SYSTEM_PROMPT = `你是一名给中文母语英语学习者用的「口语拆解助手」。用户会从 TikTok / Instagram / 美剧字幕里抄英文表达，你把它拆成结构化字段。

【输入特征】
用户粘贴的可能是：
- 单一英文句子（最常见）
- 字幕片段：多句英文混在一起，可能有 [Music] / [Applause] 这类噪音
- 带转写错误：自动字幕常把 "I've" 写成 "Ive"、"gonna" 写成 "gonna" 等
- 中英混杂：可能附带中文说明或表情符号

【你的任务】
先判断要学哪一句、再修正、再拆解。严格按 JSON 输出，不要任何 markdown 代码块、不要任何前后缀解释。

【已有主题（必须优先复用）】
<existing_topics>
__EXISTING_TOPICS__
</existing_topics>

规则：
1. 如果输入含多句英文，只拆「最有学习价值」的那一句（最地道、最能套用的），把选中的原句放到 "picked"。
2. 如果原句有明显的转写错误，先在 "corrected" 给出修正版本，再拆解；如果没错误，"corrected" 等于 "picked"。
3. "suggestedTopics" 必须是 1-3 个主题标签：
   - 优先从 <existing_topics> 里挑最贴合的（按相关度从高到低排）
   - 只有当已有主题全部不贴时，才新建
   - 主题用 1-3 个词，中英文都可，统一小写优先
4. 如果输入不是英文，或完全无法拆成可学习表达（如纯乱码、纯中文、纯噪音），返回 {"error": "简短中文原因"}，不要其它字段。
5. 字段定义：
   - "picked": 选中拆解的那一句原句
   - "corrected": 修正后的原句
   - "meaning": 一句中文大白话，说明这个表达在真实场景里到底什么意思、传递什么情绪（不是逐字翻译）
   - "skeleton": 句型骨架，可替换部分用 "___" 标出（如 "I've been meaning to ___"）。必须至少含一个 "___"。如果整句是固定表达无法套用，用 "corrected" 本身
   - "scenarios": 字符串数组，2-3 条中文短句写"什么时候用"
   - "tone": 中文短语描述语气/语域
   - "avoid": 中文短语写不适合的场合；无则给 ""
   - "examples": 字符串数组，3 条用同样骨架的仿写英文，填入部分要具体可信
6. 只输出 JSON 对象本体。

【示例】
输入（原句带转写错误）："Ive been meaning to try that place"
输出：
{"picked":"Ive been meaning to try that place","corrected":"I've been meaning to try that place","meaning":"想说『我早就想去试试了』，带一点早就想但一直没动的语气","skeleton":"I've been meaning to ___","scenarios":["朋友推荐了一家店但你一直没去","被问最近有没有想做某事"],"tone":"口语、随意、朋友间","avoid":"","examples":["I've been meaning to call her back.","I've been meaning to read that book.","I've been meaning to fix the kitchen sink."],"suggestedTopics":["casual plans","社交寒暄"]}`

function buildSystemPrompt(existingTopics: string[]): string {
  const block = existingTopics.length > 0 ? existingTopics.map((t) => `- ${t}`).join('\n') : '(空，用户的第一个卡片)'
  return SYSTEM_PROMPT.replace('__EXISTING_TOPICS__', block)
}

function buildUserPrompt(original: string, hintTopic?: string): string {
  // 用 JSON.stringify 安全包裹，避免原句里的引号/换行破坏格式
  const obj: { text: string; hintTopic?: string } = { text: original }
  const trimmedHint = hintTopic?.trim()
  if (trimmedHint) obj.hintTopic = trimmedHint
  return JSON.stringify(obj)
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const m = trimmed.match(/\{[\s\S]*\}/)
  if (m) return m[0]
  throw new Error('模型返回的不是 JSON')
}

function normalize(raw: unknown, fallbackOriginal: string): AnalyzeResult {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  if (typeof r.error === 'string' && r.error.trim()) {
    return {
      picked: fallbackOriginal,
      corrected: fallbackOriginal,
      meaning: '',
      skeleton: fallbackOriginal,
      scenarios: [],
      tone: '',
      avoid: '',
      examples: [],
      suggestedTopics: [],
      error: r.error.trim(),
    }
  }

  const picked = str(r.picked) || fallbackOriginal
  const corrected = str(r.corrected) || picked
  const skeleton = str(r.skeleton) || corrected // 兜底：模型没给骨架时用修正后的原句
  return {
    picked,
    corrected,
    meaning: str(r.meaning),
    skeleton,
    scenarios: arr(r.scenarios).slice(0, 3),
    tone: str(r.tone),
    avoid: str(r.avoid),
    examples: arr(r.examples).slice(0, 3),
    suggestedTopics: arr(r.suggestedTopics).slice(0, 3),
  }
}

export async function analyzeSentence(
  original: string,
  hintTopic: string | undefined,
  existingTopics: string[],
  settings: Settings,
): Promise<AnalyzeResult> {
  if (!settings.apiKey) {
    throw new Error('未填写 API Key：请在「设置」中填入 DeepSeek API Key。')
  }
  const base = settings.apiBase.replace(/\/+$/, '')
  const resp = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(existingTopics) },
        { role: 'user', content: buildUserPrompt(original, hintTopic) },
      ],
    }),
  })
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`API 调用失败 (${resp.status})：${errText.slice(0, 200) || resp.statusText}`)
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('模型未返回内容')
  const jsonText = extractJson(content)
  const parsed: unknown = JSON.parse(jsonText)
  return normalize(parsed, original)
}
