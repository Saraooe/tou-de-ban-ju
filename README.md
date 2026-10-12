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
    deepseek.ts                 # DeepSeek Chat API
  components/                   # Header / PasteBox / CardList / CardDetail / ...
  App.tsx
  index.css
```

## 数据格式

每张卡片的字段：

- 原句、来源链接（可选）
- 主题（任意字符串，按主题筛选用）
- 句型骨架（用 `___` 标可替换部分）
- 2–3 个「什么时候用」的场景
- 语气 / 场合，以及「哪些场合别用」
- 3 个仿写句
- 使用次数 + 上次练习时间（用于「今日练习」抽题）

数据存取走 `StorageAdapter` 接口，未来要换 IndexedDB 或后端只需新增一个实现类，UI 不动。
