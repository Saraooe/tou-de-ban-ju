/**
 * 并发执行一组任务，同时最多 limit 个。
 * 单个任务抛错不会影响其他任务（错误被吞掉，由任务自己处理/记录）。
 */
export async function runWithLimit(
  tasks: (() => Promise<void>)[],
  limit: number,
): Promise<void> {
  const queue = [...tasks]
  const workerCount = Math.min(Math.max(1, limit), queue.length)
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      const task = queue.shift()
      if (!task) return
      try {
        await task()
      } catch {
        // 单个失败不影响其他句子
      }
    }
  })
  await Promise.all(workers)
}
