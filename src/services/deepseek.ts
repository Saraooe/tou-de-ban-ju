import type { Settings } from '@/types'

// 调用大模型把一句英文拆成结构化字段。
// 返回的字段是「草案」，用户保存前仍可手改。

export interface AnalyzeResult {
  skeleton: string
  scenarios: string[]
  tone: string
  avoid: string
  examples: string[]
  suggestedTopics: string[]
}

const SYSTEM_PROMPT = `你是一名给中文母语英语学习者用的「口语拆解助手」。用户会给你一句从 TikTok / Instagram / 美剧字幕里看到的英文表达，你要把它拆成结构化字段，便于用户学习与复习。

要求：
1. 严格按 JSON 输出，不要任何 markdown 代码块、不要任何解释、不要任何前后缀。
2. JSON 字段：
   - "skeleton": 句型骨架，把可替换的部分用三个下划线 "___" 标出，例如 "I've been meaning to ___"、"That's a ___ way to put it"、"lowkey ___"
   - "scenarios": 字符串数组，2-3 条中文短句，写明"什么时候用"，例如 ["回应朋友推荐时", "想表达自己一直想做某事"]
   - "tone": 中文短语，描述语气/语域，可多值用顿号分隔，例如 "口语、随意、朋友间"、"偏正式、新闻/书面"、"俚语、年轻人社交"
   - "avoid": 中文短语，描述不适合用的场合；如无特别禁忌，给空字符串 ""
   - "examples": 字符串数组，3 条用同样骨架的仿写英文句子，每条不一样；填入的部分要具体、可信
   - "suggestedTopics": 字符串数组，1-3 个简短主题标签，中英文都可以，例 ["社交寒暄", "casual plans", "反馈"]
3. 不要输出"original"字段，原句由前端自己保存。
4. 只输出 JSON 对象本体。`

function buildUserPrompt(original: string, hintTopic?: string): string {
  const topic = hintTopic?.trim()
  return `原句："${original}"${topic ? `\n用户自选主题（仅参考，可被改）：${topic}` : ''}`
}

function extractJson(text: string): string {
  // 模型偶尔会包 ```json ``` 或前后加闲话，做一次鲁棒剥离
  const trimmed = text.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const m = trimmed.match(/\{[\s\S]*\}/)
  if (m) return m[0]
  throw new Error('模型返回的不是 JSON')
}

function normalize(raw: unknown): AnalyzeResult {
  // 兼容模型返回结构小差异，确保字段齐全且类型正确
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []
  const str = (v: unknown, def = ''): string => (typeof v === 'string' ? v.trim() : def)
  return {
    skeleton: str(r.skeleton) || '___',
    scenarios: arr(r.scenarios).slice(0, 3),
    tone: str(r.tone) || '口语',
    avoid: str(r.avoid),
    examples: arr(r.examples).slice(0, 3),
    suggestedTopics: arr(r.suggestedTopics).slice(0, 3),
  }
}

export async function analyzeSentence(
  original: string,
  hintTopic: string | undefined,
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
        { role: 'system', content: SYSTEM_PROMPT },
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
  return normalize(parsed)
}
