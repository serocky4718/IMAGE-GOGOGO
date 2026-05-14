# v0.1.0 技术开发文档

> 本文档聚焦「如何实现」（技术架构、数据模型、接口设计）。
> 功能需求 → `prd.md`　　界面设计 → `design.md`　　时间排期 → `plan.md`

---

## 0. 项目现状审查

### 0.1 审查结果

- [x] 已读取项目目录结构，当前仓库仅包含 `docs/prd/` 文档目录。
- [x] 已确认实际技术栈：当前尚未初始化应用代码，无 `package.json`、入口文件或构建配置。
- [x] 已读取核心入口文件和主要业务模块：当前不存在应用入口文件和业务模块。
- [x] 已确认现有的数据模型：当前不存在业务数据模型或数据库。
- [x] 已了解现有的命名规范和代码组织模式：当前无既有代码规范，首版需要建立基础目录结构。
- [x] 本次方案与现有架构无冲突：仓库为空应用状态，可从零初始化桌面应用。

### 0.2 现状结论

本项目目前处于“文档先行、代码未初始化”的状态。v0.1.0 的开发需要先完成桌面应用脚手架，再实现主工作台、API 配置、生成参数、图片预览和第三方 API 请求闭环。

---

## 1. 架构概览

### 1.1 当前架构

```text
E:\Project\image-api-gogogo
└── docs/
    └── prd/
        ├── README.md
        └── v0.1.0/
            ├── prd.md
            ├── design.md
            └── dev.md
```

**当前技术栈**：
- 桌面端：未初始化
- 前端：未初始化
- 后端：无
- 数据库/存储：无
- 关键依赖：无

### 1.2 本次变更

v0.1.0 需要新增一个 Windows 10 可运行的本地桌面应用。应用内部包含：

- 桌面窗口进程：负责窗口生命周期、文件选择、本地配置读写和打包为 EXE。
- 前端渲染界面：负责三栏工作台、主题切换、参数控件、输入区、图片预览和状态展示。
- API 适配层：负责将用户配置和生成参数转为第三方 API 请求，并处理成功/失败响应。
- 本地数据层：负责保存 API 配置、主题选择和生成记录。

---

## 2. 技术方案

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 适用性 |
|------|------|------|--------|
| Electron + Vite + React + TypeScript | Windows EXE 支持成熟，前端 UI 开发效率高，文件选择/本地存储/API 请求能力完整 | 包体较大 | 最适合首版快速交付 |
| Tauri + Vite + React + TypeScript | 包体小，性能好 | Windows 构建环境要求更高，需要 Rust 工具链，首版配置成本更高 | 可作为后续轻量化方向 |
| WPF / WinUI + .NET | Windows 原生体验好，EXE 交付自然 | UI 开发和主题迭代不如 Web 技术灵活，生图工作台视觉实现成本更高 | 适合完全 Windows 原生路线 |

**结论**：v0.1.0 选择 Electron + Vite + React + TypeScript。  
原因：当前项目从零开始，首要目标是快速形成 Windows 10 可运行 EXE，并实现复杂三栏 UI、主题切换、图片预览、本地文件选择和第三方 API 接入。Electron 方案交付路径清晰，风险最低。

### 2.2 技术架构

```text
┌─────────────────────────────────────────────────────────────┐
│ Electron Main Process                                        │
│ - 创建窗口                                                   │
│ - 打开文件选择器                                             │
│ - 读写本地配置/生成记录                                      │
│ - 应用打包入口                                               │
└───────────────┬─────────────────────────────────────────────┘
                │ IPC
┌───────────────▼─────────────────────────────────────────────┐
│ Electron Preload                                             │
│ - 暴露安全 API 给渲染层                                      │
│ - 隔离 Node 能力                                              │
└───────────────┬─────────────────────────────────────────────┘
                │ window.appApi
┌───────────────▼─────────────────────────────────────────────┐
│ React Renderer                                               │
│ - 主工作台 UI                                                │
│ - 主题系统                                                   │
│ - API 设置弹窗                                               │
│ - 图片预览弹窗                                               │
│ - 生成状态管理                                               │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ API Adapter Layer                                            │
│ - 自定义 API 配置方案                                        │
│ - 文生图 / 图生图请求组装                                    │
│ - 响应解析                                                   │
│ - 错误归一化                                                 │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ Third-party Image API                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 核心模块设计

#### 桌面壳模块

- 职责：创建 Windows 桌面窗口，提供最小化、最大化、关闭等标准窗口能力。
- 主要能力：
  - 应用启动后加载主工作台。
  - 打开图片文件选择器。
  - 读写本地 JSON 配置。
  - 打包生成 Windows EXE。

#### UI 工作台模块

- 职责：实现 `design.md` 中的三栏 1:2:2 布局。
- 主要能力：
  - 左侧聊天记录。
  - 中间主生图区、参数区和提示词输入。
  - 右侧图片预览与生成记录。
  - API 设置弹窗和图片预览弹窗。

#### 主题系统模块

- 职责：支持多套主题配色。
- 首版建议实现：
  - 奶油粉创作室。
  - 曜石黑金控制台。
  - 云白蓝专业版。
- 后续可继续加入极光紫青创作台、石墨粉点缀。

#### API 配置模块

- 职责：保存和读取第三方 API 配置。
- 配置内容：
  - 服务名称。
  - API 地址。
  - 认证信息。
  - 模型名称。
  - 能力边界状态：支持、不支持、未知。
  - 首版约定：能力边界用于提示和记录，不作为强制禁用或阻断规则。

#### 生图请求模块

- 职责：根据当前模式和参数发起第三方 API 请求。
- 首版模式：
  - 文生图：提示词 + 模型 + 比例 + 分辨率 + quality。
  - 图生图：参考图 + 提示词 + 模型 + 比例 + 分辨率 + quality。
- 错误处理：
  - 网络错误。
  - API 配置缺失。
  - 鉴权失败。
  - 参数不支持或能力未知时的提示文案。
  - 返回格式无法识别。

#### 本地记录模块

- 职责：保存生成记录和图片引用。
- 首版记录范围：
  - 提示词摘要。
  - 模式。
  - 模型。
  - 比例。
  - 分辨率。
  - quality。
  - 生成状态。
  - 生成时间。
  - 图片本地路径或远程 URL。
  - 参考图路径。

---

## 3. 文件变更清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `package.json` | 项目脚本、依赖和打包配置入口 |
| `tsconfig.json` | TypeScript 基础配置 |
| `vite.config.ts` | 渲染进程构建配置 |
| `electron/main.ts` | Electron 主进程入口 |
| `electron/preload.ts` | 渲染层安全桥接 |
| `src/main.tsx` | React 渲染入口 |
| `src/App.tsx` | 应用根组件 |
| `src/styles/global.css` | 全局样式、布局基础 |
| `src/styles/themes.css` | 多主题 CSS 变量 |
| `src/types/app.ts` | API 配置、生成参数、生成记录类型 |
| `src/lib/apiAdapter.ts` | 第三方 API 请求适配与错误归一化 |
| `src/lib/storage.ts` | 本地配置和生成记录读写封装 |
| `src/components/Workspace.tsx` | 三栏主工作台 |
| `src/components/ChatHistory.tsx` | 左侧聊天记录 |
| `src/components/GenerationCanvas.tsx` | 中间主生图区 |
| `src/components/PromptComposer.tsx` | 参数区和提示词输入 |
| `src/components/PreviewGallery.tsx` | 右侧图片预览与生成记录 |
| `src/components/ApiSettingsDialog.tsx` | API 设置弹窗 |
| `src/components/ImagePreviewDialog.tsx` | 图片预览弹窗 |
| `src/components/ThemeSwitcher.tsx` | 主题切换入口 |
| `src/vite-env.d.ts` | Vite/前端环境类型声明 |

### 改动文件

| 文件路径 | 改动内容 |
|---------|---------|
| `docs/prd/README.md` | 后续补充 `dev.md` 和 `plan.md` 链接 |

### 删除文件

无。

---

## 4. 数据模型

本版本不引入数据库，使用本地 JSON 文件保存配置和生成记录。具体存放位置由桌面应用运行环境提供，避免写死到项目目录。

### 4.1 API 配置

```ts
type CapabilityState = 'supported' | 'unsupported' | 'unknown';

interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  capabilities: {
    textToImage: CapabilityState;
    imageToImage: CapabilityState;
    aspectRatio: CapabilityState;
    resolution: CapabilityState;
    quality: CapabilityState;
  };
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 生成参数

```ts
type GenerationMode = 'text-to-image' | 'image-to-image';
type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
type ResolutionPreset = '1K' | '2K' | '4K';
type QualityPreset = 'low' | 'medium' | 'high';

interface GenerationParams {
  mode: GenerationMode;
  prompt: string;
  referenceImagePath?: string;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  quality: QualityPreset;
  apiConfigId: string;
}
```

### 4.3 生成记录

```ts
type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

interface GenerationRecord {
  id: string;
  prompt: string;
  promptSummary: string;
  mode: GenerationMode;
  model: string;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  quality: QualityPreset;
  status: GenerationStatus;
  createdAt: string;
  completedAt?: string;
  imageUrl?: string;
  imagePath?: string;
  referenceImagePath?: string;
  errorMessage?: string;
}
```

### 4.4 应用设置

```ts
type ThemeId = 'cream-pink' | 'obsidian-gold' | 'cloud-blue' | 'aurora-cyan' | 'graphite-pink';

interface AppSettings {
  activeTheme: ThemeId;
  activeApiConfigId?: string;
}
```

---

## 5. 接口影响清单

本项目 v0.1.0 为本地桌面应用，无自建后端 HTTP API。第三方 API 由用户配置，程序内部通过 API 适配层发起请求。

### 5.1 新增接口

| 接口 | 说明 | 影响点 |
|------|------|--------|
| `window.appApi.selectImage()` | 打开本地图片选择器 | 渲染层通过 preload 调用主进程能力 |
| `window.appApi.loadConfig()` | 读取本地 API 配置和应用设置 | 用于应用启动初始化 |
| `window.appApi.saveConfig(config)` | 保存本地 API 配置和应用设置 | 用于 API 设置弹窗保存 |
| `window.appApi.loadRecords()` | 读取生成记录 | 用于右侧预览区初始化 |
| `window.appApi.saveRecords(records)` | 保存生成记录 | 用于生成完成或失败后持久化 |
| `apiAdapter.generateImage(params, config)` | 调用第三方生图 API | 支持文生图和图生图请求 |

### 5.2 改动接口

无。

### 5.3 删除接口

无。

---

## 6. 测试策略

### 6.1 单元测试

- API 配置校验：
  - 缺少 endpoint 时返回配置错误。
  - 缺少 model 时返回配置错误。
  - API Key 在 UI 展示时脱敏。
- 参数校验：
  - 文生图必须有 prompt。
  - 图生图必须有 prompt 和 referenceImagePath。
  - aspectRatio、resolution、quality 只能取预设值。
- 错误归一化：
  - 网络错误转为用户可理解文案。
  - 鉴权失败转为用户可理解文案。
  - 参数不支持转为用户可理解文案，但首版不要求在提交前强制拦截。

### 6.2 集成测试

- 启动应用后展示主工作台。
- 未配置 API 时点击生成，生成按钮不可用或提示先配置。
- 保存 API 配置后，主界面显示当前 API 和模型。
- 文生图请求成功后，中间生图区和右侧预览区出现图片。
- 图生图模式下选择参考图，界面显示参考图缩略图。
- 请求失败后，聊天记录和生成记录显示失败状态。

### 6.3 手动验证清单

- Windows 10 环境下应用可启动。
- 窗口最小化、最大化、关闭可用。
- 三栏布局比例符合 1:2:2。
- 奶油粉、曜石黑金、云白蓝主题可切换。
- 图片预览弹窗可打开和关闭。
- API Key 不在主界面完整明文展示。
- 打包后 EXE 可启动。

---

## 7. 数据库变更

无数据库变更。  
本版本不需要 `sql/DDL.sql` 或 `sql/DML_init.sql`。

---

## 8. 部署与打包考虑

### 8.1 本地开发

- 使用 Node.js 环境安装依赖。
- 使用 Vite 启动渲染进程开发服务。
- 使用 Electron 启动桌面窗口。

### 8.2 Windows EXE 打包

- 使用 Electron 打包工具输出 Windows 安装包或便携 EXE。
- 打包产物应能在 Windows 10 上启动。
- 打包前需要确认第三方 API 配置不被写入安装包，只保存在用户本机运行数据目录。

### 8.3 回滚方案

- v0.1.0 为首版新增应用，无历史应用版本需要迁移。
- 若配置文件损坏，应用应允许用户重新配置 API。
- 若生成记录读取失败，应用应保留主界面可用，并提示记录加载失败。

---

## 9. 开发顺序建议

1. 初始化 Electron + Vite + React + TypeScript 项目。
2. 建立 Electron main/preload 与 renderer 通信。
3. 实现三栏主工作台静态 UI。
4. 实现主题变量和三套首发主题。
5. 实现 API 设置弹窗和本地配置读写。
6. 实现参数区、文生图/图生图模式和参考图选择。
7. 实现 API 适配层和生成请求状态流转。
8. 实现右侧生成记录与图片预览弹窗。
9. 补充测试与 Windows EXE 打包验证。
