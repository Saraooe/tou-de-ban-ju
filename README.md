# 偷得半句

把 TikTok 上看到的英文句子「偷」回来，存成卡片，按主题整理，再逼自己每天用出来。

- 数据完全在浏览器里（localStorage），不上传任何后端
- 浏览器内直调 DeepSeek 拆句（API key 存在本地设置里，不填也能用）
- 三栏布局：左主题 / 中卡片 / 右详情，顶部粘贴新句子；手机也能用

## 技术栈

Vite + React 18 + TypeScript + Tailwind CSS 3

## 本地运行

```bash
npm install
npm run dev
# 打开 http://localhost:5173/
```

## 粘贴一句话，还是粘贴一大段？

- **单句**（英文 ≤ 25 词、句末标点 ≤ 1 个）：保持原来的一步流程，点「生成卡片」直接拆解。
- **大段**（TikTok 字幕、口播转写…）：先走「挑亮点」——AI 挑出 3–5 句值得偷的，你勾选 / 改句子 / 「再多找几句」/「整段当一句处理」，然后逐句拆解进「待保存队列」，逐张确认保存，或一次「全部保存」。
- 同一批卡片共用同一个来源链接；主题优先用你填的，没填就用 AI 建议的。每张卡片会记住这句话所在的原文段落（详情页「出处上下文」里高亮显示）。
- emoji 和 `#fyp` 之类话题标签会在送进 AI 前自动去掉；超过 4000 字符只分析前 4000 字符。
- 没填 API Key 也能用：单句点「手动填写」直接开空白草稿；大段会让你自己挑一句再手动填。

## 打包

```bash
npm run build      # 输出到 dist/
npm run preview    # 本地预览构建结果
```

## 目录结构

```
src/
  types.ts                      # Card / Settings / StorageAdapter 接口
  storage/
    localStorageAdapter.ts      # 当前实现
  services/
    deepseek.ts                 # DeepSeek Chat API（callDeepSeek / analyzeSentence / extractHighlights）
  utils/
    text.ts                     # 清洗 emoji/话题标签、单句判定、截断、出处上下文、本地分句
    queue.ts                    # 待保存队列的索引推进 + 批量保存计划
    async.ts                    # runWithLimit：并发拆解的上限控制
  components/                   # Header / PasteBox / CardList / CardDetail / HighlightPicker / ...
  App.tsx
  index.css
```

## 数据格式

每张卡片的字段：

- 原句、来源链接（可选）
- 出处上下文（可选，这句话所在的原文段落，最多 600 字符）
- 主题（任意字符串，按主题筛选用）
- 句型骨架（用 `___` 标可替换部分）
- 2–3 个「什么时候用」的场景
- 语气 / 场合，以及「哪些场合别用」
- 3 个仿写句
- 使用次数 + 上次练习时间（用于「今日练习」抽题）

数据存取走 `StorageAdapter` 接口，未来要换 IndexedDB 或后端只需新增一个实现类，UI 不动。
