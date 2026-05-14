# v0.2.0 技术开发文档

> 本文档聚焦「如何实现」（技术架构、数据模型、接口设计）。  
> 功能需求 → `prd.md`　　界面设计 → `design.md`　　时间排期 → `plan.md`

---

## 0. 项目现状审查

### 0.1 审查结果

- [x] 已读取项目目录结构，当前为 Electron + Vite + React + TypeScript 桌面应用。
- [x] 已确认实际技术栈：React 18、Vite 5、Electron 28、TypeScript 5。
- [x] 已读取核心入口：`src/App.tsx`、`src/components/Workspace.tsx`、`src/components/PromptComposer.tsx`。
- [x] 已确认现有数据模型：`ApiConfig`、`GenerationParams`、`GenerationRecord`、`GenerationThread`、`PersistedState`。
- [x] 已确认现有持久化入口：`window.appApi.loadState()`、`window.appApi.saveState()`。
- [x] 本次方案与现有架构兼容，重点是扩展本地状态和组件交互，不需要引入后端或数据库。

### 0.2 当前问题

- `PromptComposer` 内部使用组件本地 `useState` 保存提示词、参考图和参数，导致切换对话后状态不是每个对话独立。
- `GenerationThread` 目前只保存 `records`，没有保存当前输入区草稿状态。
- 目前没有提示词库数据结构。
- `GenerationMode` 由用户手动选择，和“是否有参考图”的实际判断存在重复。
- `ImagePreviewDialog` 只做静态图片展示，没有缩放和拖拽状态。

---

## 1. 架构概览

### 1.1 当前架构

```text
Electron Main / Preload
  └─ window.appApi
      ├─ loadState / saveState
      ├─ selectImage / selectDirectory
      ├─ generateImage
      └─ openImageFolder / showImageContextMenu

React Renderer
  ├─ App.tsx
  │   ├─ 维护 PersistedState
  │   ├─ normalizeState 兼容旧数据
  │   └─ commit 保存状态
  └─ Workspace
      ├─ ChatHistory
      ├─ GenerationCanvas
      ├─ PromptComposer
      ├─ PreviewGallery
      ├─ ApiSettingsDialog
      └─ ImagePreviewDialog
```

### 1.2 本次变更

本版本在现有架构基础上新增和改造三类能力：

- 状态层：扩展 `GenerationThread`，新增每个对话独立的 composer 状态；扩展 `PersistedState`，新增提示词库。
- 交互层：`PromptComposer` 从自持状态改为受控组件，由 `App` 统一持久化到当前对话。
- 展示层：新增提示词库弹窗；改造图片预览弹窗，支持缩放、拖拽和重置。

---

## 2. 技术方案

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 适用性 |
|------|------|------|--------|
| 将输入状态继续留在 `PromptComposer` | 改动少 | 无法可靠持久化每个对话状态 | 不适合 |
| 将输入状态挂到 `GenerationThread` | 和对话天然绑定，持久化清晰 | 需要迁移旧状态 | 推荐 |
| 单独建立 `threadDrafts` 字典 | 与线程解耦 | 状态读取和删除线程时更复杂 | 暂不需要 |

**结论**：将输入区状态挂到 `GenerationThread`，提示词库挂到 `PersistedState`。

### 2.2 数据模型调整

#### 新增 `ThreadComposerState`

```ts
export interface ThreadComposerState {
  prompt: string;
  referenceImage?: SelectedImage;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  quality: QualityPreset;
}
```

#### 修改 `GenerationThread`

```ts
export interface GenerationThread {
  id: string;
  title: string;
  createdAt: string;
  records: GenerationRecord[];
  composer: ThreadComposerState;
}
```

#### 新增 `PromptPreset`

```ts
export interface PromptPreset {
  id: string;
  title: string;
  prompt: string;
  thumbnailDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### 修改 `PersistedState`

```ts
export interface PersistedState {
  apiConfigs: ApiConfig[];
  records?: GenerationRecord[];
  threads: GenerationThread[];
  promptPresets: PromptPreset[];
  settings: AppSettings;
}
```

#### 修改比例类型

```ts
export type AspectRatio =
  | '1:1'
  | '4:3'
  | '3:4'
  | '16:9'
  | '9:16'
  | '3:2'
  | '2:3'
  | '2:1';
```

### 2.3 状态迁移

`normalizeState` 需要兼容旧数据：

- 如果旧线程没有 `composer`，补默认值。
- 如果旧状态没有 `promptPresets`，补空数组。
- 如果旧状态没有 `threads`，继续使用 `records` 迁移到默认线程。
- 默认 composer 值建议为：`prompt: ''`、`aspectRatio: '16:9'`、`resolution: '1K'`、`quality: 'medium'`。

### 2.4 自动模式计算

`PromptComposer` 不再维护 `mode` 状态。

生成时通过参考图计算：

```ts
const mode: GenerationMode = composer.referenceImage ? 'image-to-image' : 'text-to-image';
```

能力边界检查同样使用该计算结果。

### 2.5 图片缩放拖拽

`ImagePreviewDialog` 内部维护临时 UI 状态：

- `scale`
- `offsetX`
- `offsetY`
- `isDragging`
- `dragStart`

要求：

- 缩放范围建议限制在 `0.25` 到 `5`。
- 点击重置恢复 `scale = 1`、`offsetX = 0`、`offsetY = 0`。
- `record` 变化或弹窗关闭后重置状态。
- 拖拽事件需要在鼠标松开时结束，避免状态卡住。

---

## 3. 文件变更清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `src/components/PromptLibraryDialog.tsx` | 提示词库弹窗，负责保存、读取、删除提示词 |

### 改动文件

| 文件路径 | 改动内容 |
|---------|---------|
| `src/types/app.ts` | 新增 `ThreadComposerState`、`PromptPreset`，扩展线程和状态类型，扩展比例类型 |
| `src/lib/state.ts` | 默认状态补充线程 composer 和 `promptPresets` |
| `src/lib/options.ts` | 比例增加 `3:2`、`2:3`、`2:1` |
| `src/App.tsx` | 增加线程 composer 更新、提示词库增删改读、状态迁移 |
| `src/components/Workspace.tsx` | 接入提示词库弹窗，传递当前线程 composer 和更新函数，调整顶部品牌 |
| `src/components/PromptComposer.tsx` | 改为受控组件，移除手动模式，改造参数选择器，增加提示词保存/读取入口 |
| `src/components/ImagePreviewDialog.tsx` | 增加缩放、拖拽、重置 |
| `src/components/GenerationCanvas.tsx` | 当前图继续打开统一图片预览 |
| `src/components/PreviewGallery.tsx` | 生成记录继续打开统一图片预览 |
| `src/styles/global.css` | 调整整体布局、参数选择器、提示词库、图片预览交互样式 |
| `src/styles/themes.css` | 调整默认主题为更简洁克制的工具风格 |
| `package.json` | `build.productName` 改为“Rocky的图片工作室”，必要时同步描述 |

### 删除文件

无。

---

## 4. 接口影响清单

本项目为本地桌面应用，无自建后端 HTTP API。本版本不新增外部服务接口。

### 4.1 新增接口

无。

### 4.2 改动接口

| 接口 | 改动内容 | 影响点 |
|------|----------|--------|
| `window.appApi.saveState(state)` | `PersistedState` 新增 `promptPresets`，`threads[].composer` | 需要保持旧数据兼容 |
| `window.appApi.loadState()` | 读取后由渲染层 `normalizeState` 补齐新字段 | Electron 主进程无需理解新字段 |
| `window.appApi.generateImage(params, config)` | `params.mode` 改为由参考图自动计算后传入 | API 适配层协议不变 |

### 4.3 删除接口

无。

---

## 5. 测试策略

### 5.1 类型与构建

- 执行 `npm run typecheck`。
- 执行 `npm run build`。

### 5.2 状态迁移测试

- 使用旧版本无 `promptPresets` 的状态启动应用，应正常进入。
- 使用旧版本无 `threads[].composer` 的状态启动应用，应自动补默认 composer。

### 5.3 功能测试

- 对话 A 输入提示词，切换到对话 B，确认 B 为空或保持自己的内容。
- 对话 A/B 选择不同参数，切换后确认各自恢复。
- 保存提示词，重启后确认仍存在。
- 读取提示词，只更新当前对话输入框。
- 无参考图生成时，记录模式为文生图。
- 有参考图生成时，记录模式为图生图。
- 图片预览弹窗支持放大、缩小、拖拽、重置。

### 5.4 回归测试

- API 设置弹窗仍可新增和修改 API。
- 生成记录仍可选择、查看、删除。
- 右键打开文件夹和图片上下文菜单不受影响。
- 图片保存目录设置不受影响。

---

## 6. 数据库变更

无数据库变更。  
本版本继续使用本地 JSON 状态持久化，不需要 `sql/DDL.sql` 或 `sql/DML_init.sql`。

---

## 7. 部署与打包考虑

- 打包产品名称需要从“本地生图工作台”改为“Rocky的图片工作室”。
- 旧用户本地状态需要通过 `normalizeState` 自动迁移，不需要额外迁移脚本。
- 若提示词库字段损坏，应回退为空数组，不影响主流程启动。

---

## 8. Builder 执行顺序建议

1. 扩展类型和默认状态。
2. 改造 `normalizeState`，保证旧数据兼容。
3. 将 `PromptComposer` 改为受控组件，实现每对话独立设置。
4. 移除手动模式，改为根据参考图自动计算。
5. 改造参数选择器并增加比例选项。
6. 新增提示词库弹窗和状态操作。
7. 改造图片预览弹窗的缩放、拖拽、重置。
8. 调整界面样式和品牌名称。
9. 跑类型检查、构建和手动 QA。
