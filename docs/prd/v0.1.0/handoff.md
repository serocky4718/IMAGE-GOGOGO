# v0.1.0 项目交接说明

**项目名称**: 本地第三方 API 生图工具  
**版本号**: v0.1.0  
**交接日期**: 2026-05-14  
**当前状态**: QA 通过，可进入下一步

---

## 当前阶段结论

v0.1.0 已完成首版核心闭环：

- 配置第三方 API。
- 选择文生图 / 图生图。
- 设置比例、分辨率、quality。
- 发起 OpenAI-compatible 图片接口请求。
- 展示生成结果、右侧预览和生成记录。
- 处理请求超时、下载超时、API 错误、返回缺图等异常。
- 保存 API 配置、主题、生成记录等本地状态。

当前版本已按最新产品口径统一：`supported / unsupported / unknown` 仅用于能力边界提示和记录，不作为强制禁用或阻断规则。

---

## 下一个接手人建议先看

1. `docs/prd/v0.1.0/qa.md`
   - 先看顶部最终 QA 结论。
   - 历史记录只用于了解问题演进，不作为当前验收口径。

2. `docs/prd/v0.1.0/release-checklist.md`
   - 发布前人工回归照这份清单走。
   - 特别关注真实 API、真实 EXE、状态恢复和错误提示。

3. `docs/prd/v0.1.0/prd.md`
   - 看产品范围和最终验收口径。
   - capability 的最新定义以这里为准。

4. `docs/prd/v0.1.0/dev.md`
   - 看技术方案、数据模型和测试策略。

---

## 关键产品口径

### capability 不做强限制

首版能力边界状态含义如下：

- `supported`：已知支持。
- `unsupported`：已知可能不支持，但首版仍允许用户尝试。
- `unknown`：未确认，允许用户尝试。

因此，下一个接手人不要把 `unsupported` 不能阻断生成视为 bug。若后续要改成强限制，应放到 v0.2.0 或后续版本作为单独需求。

### 首版协议范围

当前只收敛支持 `OpenAI-compatible 图片接口`：

- 请求体包含 `model / prompt / size / quality / image / response_format`。
- 响应解析 `url` 或 `b64_json`。
- 其他 provider/template 层建议放到后续版本扩展。

---

## 关键实现入口

- `src/lib/api.ts`
  - capability 文案、协议常量、URL 校验、请求体构造、响应解析。

- `src/lib/image-generation.ts`
  - 共享生成网络层。
  - 包含 `fetchWithTimeout` 和 `requestOpenAiCompatibleImage`。

- `electron/main.ts`
  - Electron 主进程。
  - 负责窗口、IPC、状态文件读写、图片选择、生成图片保存。

- `src/components/PromptComposer.tsx`
  - 提示词输入、模式/比例/分辨率/quality 控件、capability 提示。

- `src/components/ApiSettingsDialog.tsx`
  - API 配置、URL 校验、能力边界设置、保存目录设置。

- `tests/openai-compatible-contract.test.mjs`
  - mock HTTP server 契约测试。
  - 覆盖成功、失败、缺图、请求超时、下载超时、`unsupported` 仍允许请求。

---

## 已验证命令

```bash
npm run typecheck
npm run build
npm run test:mock-api
```

以上命令当前均已通过。

已做 Electron 启动烟测：开发环境 Electron 可启动，无 stderr 输出。

---

## 发布前仍建议做

- 按 `release-checklist.md` 完成一次人工回归。
- 使用真实 OpenAI-compatible API 验证：
  - `url` 返回。
  - `b64_json` 返回。
  - 4xx / 5xx 错误。
  - 请求超时。
- 用打包后的 EXE 验证：
  - 首次启动。
  - API 配置保存。
  - 生成记录恢复。
  - 图片预览。
  - 状态文件损坏后的提示与回退。

---

## 建议进入下一阶段时考虑

v0.2.0 可选方向：

- 多 provider/template 协议适配。
- capability 强限制是否作为可选策略。
- 批量生成队列。
- 历史记录管理和搜索。
- 图片保存、导出、重命名能力。
- 更完整的端到端 Electron 自动化测试。

