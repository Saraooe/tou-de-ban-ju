// 简易 id 生成，不引第三方
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function nowMs(): number {
  return Date.now()
}
