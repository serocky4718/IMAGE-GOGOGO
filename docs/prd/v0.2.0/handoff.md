# v0.2.0 Builder 交接说明

**项目名称**: Rocky的图片工作室  
**版本号**: v0.2.0  
**交接日期**: 2026-05-14  
**当前状态**: 发布阻塞项已关闭，代码冻结，可进入发布

---

## 本轮实现范围

本次按 `docs/prd/v0.2.0/dev.md`、`docs/prd/v0.2.0/plan.md` 和 QA 修改清单完成完整 `v0.2.0` 验收范围，并补完发布前收尾、人工回归、发布打包与启动烟测，覆盖：

- 扩展状态模型，支持每个对话独立保存输入区草稿。
- 增加旧数据兼容迁移。
- 移除手动模式切换，改为根据参考图自动判断文生图 / 图生图。
- 参数控件改为紧凑下拉选择，并增加 `3:2`、`2:3`、`2:1` 比例。
- 新增提示词库弹窗，支持保存、读取、删除、缩略图展示。
- 图片预览支持缩放、拖拽、重置。
- 提示词保存缩略图优先使用当前选中的生成图，再回退到参考图。
- 提示词保存按钮增加保存中禁用，避免重复提交。
- 主界面标题改为“Rocky的图片工作室”，删除标题图标。
- 移除输入区重复的“当前 API”和“参数边界：模式”。
- 同步更新 `package.json` productName、Electron 窗口标题和默认图片保存目录名称。
- 同步更新 `package.json` / `package-lock.json` 项目版本为 `0.2.0`，确保发布产物版本号正确。
- 清理未使用的 `.brand-icon` 样式残留。
- 新增 `docs/prd/v0.2.0/release-checklist.md`，用于发布前人工回归。
- `npm run dist` 发布打包通过，并生成 `0.2.0` 安装包与便携包。
- 安装包与便携包启动烟测通过。

---

## QA 建议先看

1. `docs/prd/v0.2.0/plan.md`
   - 直接按里面的 `QA 验收清单` 验证。

2. `docs/prd/v0.2.0/dev.md`
   - 看 `2.2 数据模型调整`、`2.3 状态迁移`、`2.5 图片缩放拖拽`。

3. `src/App.tsx`
   - `normalizeState`
   - `normalizeComposer`
   - `updateThreadComposer`
   - `savePromptPreset`

4. `src/components/PromptComposer.tsx`
   - 当前线程受控输入区
   - 自动模式判断
   - 下拉参数控件

5. `src/components/PromptLibraryDialog.tsx`
   - 提示词保存、读取、删除

6. `src/components/ImagePreviewDialog.tsx`
   - 缩放、拖拽、重置逻辑

---

## 关键实现说明

### 1. 每个对话独立 composer 状态

`GenerationThread` 新增 `composer` 字段，保存：

- `prompt`
- `referenceImage`
- `aspectRatio`
- `resolution`
- `quality`

`PromptComposer` 已从本地 `useState` 改为受控组件。  
切换线程后，应恢复该线程自己的草稿状态。

### 2. 旧状态迁移

`normalizeState` 已兼容以下旧数据：

- 旧线程没有 `composer`
- 旧状态没有 `promptPresets`
- 旧状态只有 `records`，没有 `threads`

期望结果：旧用户状态启动时不白屏，且自动补齐默认字段。

### 3. 自动模式判断

不再提供手动切换模式按钮。  
当前逻辑为：

- 无参考图：`text-to-image`
- 有参考图：`image-to-image`

QA 需要重点确认：模式是否完全由参考图存在与否决定。

### 4. 提示词库

提示词库数据持久化到 `PersistedState.promptPresets`。

支持：

- 从当前输入区保存提示词
- 在列表中读取到当前对话
- 删除提示词
- 有缩略图时显示保存时的预览图

当前读取逻辑只更新当前线程的 `prompt`，不会覆盖当前线程的参考图和参数。  
当前缩略图优先级为：

1. 当前选中的生成图
2. 当前参考图
3. 占位图

保存时带有 `isSaving` 禁用态，并对相同 `title + prompt` 做轻量去重更新。

### 5. 图片预览

预览弹窗支持：

- 放大
- 缩小
- 拖拽
- 重置

缩放范围限制为 `0.25` 到 `5`。  
记录切换或关闭弹窗后会重置视图状态。

---

## 本次修改文件

- `src/types/app.ts`
- `src/lib/state.ts`
- `src/App.tsx`
- `src/lib/options.ts`
- `src/components/Workspace.tsx`
- `src/components/PromptComposer.tsx`
- `src/components/PromptLibraryDialog.tsx`
- `src/components/ImagePreviewDialog.tsx`
- `src/styles/global.css`
- `electron/main.ts`
- `package.json`
- `package-lock.json`
- `docs/prd/v0.2.0/release-checklist.md`
- `docs/prd/v0.2.0/qa.md`
- `docs/prd/v0.2.0/review.md`

---

## 已执行检查命令

```bash
npm run typecheck
npm run build
npm run test:mock-api
npm run dist
```

结果：

- `npm run typecheck` 通过
- `npm run build` 通过
- `npm run test:mock-api` 通过
- `npm run dist` 通过，生成：
  - `release/Rocky的图片工作室 Setup 0.2.0.exe`
  - `release/Rocky的图片工作室 0.2.0.exe`

---

## 发布阻塞项处理结果

发布前轻量 Review 曾发现一个 Blocker：目标版本为 `v0.2.0`，但 `package.json` / `package-lock.json` 项目版本仍为 `0.1.0`，会导致发布包产物版本号错误。

该问题已由 Builder 定点修复，并由 Reviewer 回归通过：

- `package.json` 项目版本已更新为 `0.2.0`。
- `package-lock.json` 顶部版本号和根 package 版本号已更新为 `0.2.0`。
- `docs/prd/v0.2.0/qa.md` 发布产物记录已同步为 `0.2.0`。
- `docs/prd/v0.2.0/release-checklist.md` 发布产物记录已同步为 `0.2.0`。
- Reviewer 已复跑 `npm run typecheck`、`npm run test:mock-api`、`npm run dist`，全部通过。

详细记录见：

- `docs/prd/v0.2.0/review.md`

---

## 发布前人工回归与发布烟测

以下项目已由 QA / 发布前回归手动确认，详情见 `docs/prd/v0.2.0/qa.md`：

- Electron 真机启动与窗口行为
- 主界面品牌文案与窗口标题
- 默认图片保存目录
- 旧 `state.json` 迁移
- 两个对话的 composer 隔离
- 提示词保存 / 读取 / 去重 / 缩略图优先级
- 文生图 / 图生图自动判断
- 图片预览缩放 / 拖拽 / 重置
- API 设置与 mock API 场景回归

发布打包与烟测结果：

- `npm run dist` 通过。
- 已生成 `0.2.0` 安装包与便携包。
  - `release/Rocky的图片工作室 Setup 0.2.0.exe`
  - `release/Rocky的图片工作室 0.2.0.exe`
- 安装包启动烟测通过。
- 便携包启动烟测通过。

---

## QA 重点关注

- 启动旧版本状态数据，应用是否正常迁移。
- 新建两个对话后，提示词、参数、参考图是否真正隔离。
- 切换线程后未生成的草稿是否保留。
- 提示词库保存后是否立即出现，重启后是否仍存在。
- 读取提示词后是否只影响当前对话。
- 提示词保存时，是否优先取当前选中的生成图作为缩略图。
- 连续点击提示词保存按钮时，是否会被保存中状态正确拦住。
- 无参考图生成是否为文生图。
- 有参考图生成是否为图生图。
- 比例选项是否包含 `3:2`、`2:3`、`2:1`。
- 当前图和生成记录图是否都能缩放、拖拽、重置。
- 拖拽时鼠标释放后，是否能正确停止拖动。
- 主界面标题是否为“Rocky的图片工作室”，且不显示标题图标。
- 输入区是否不再重复显示“当前 API”和“参数边界：模式”。
- 打包 productName、Electron 窗口标题、默认图片保存目录是否已同步新名称。
- 发布前人工回归项是否都已在真机 / EXE 场景下确认。

---

## 未完成事项

以下内容仍属于后续范围：

- P2：提示词搜索和分类
- P2：图片预览快捷键
- P2：拖拽图片到输入区作为参考图

---

## 当前结论

Builder 侧已完成完整 `v0.2.0` 的 P0 / P1 实现，发布版本号 Blocker 已关闭，并已执行：

```bash
npm run typecheck
npm run build
npm run test:mock-api
npm run dist
```

以上命令通过后，代码侧发布前收尾、人工回归、发布打包和启动烟测均已完成。当前版本可进入发布；发布时只选择 `0.2.0` 产物分发。Builder 继续保持代码冻结，仅在发布失败项出现时定点修复并重新回交 QA / Reviewer。
