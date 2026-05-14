import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Plus, Settings } from 'lucide-react';
import ApiSettingsDialog from './ApiSettingsDialog';
import ChatHistory from './ChatHistory';
import GenerationCanvas from './GenerationCanvas';
import ImagePreviewDialog from './ImagePreviewDialog';
import PreviewGallery from './PreviewGallery';
import PromptComposer from './PromptComposer';
import ThemeSwitcher from './ThemeSwitcher';
import { summarizePrompt } from '../lib/options';
import type {
  ApiConfig,
  GenerationParams,
  GenerationRecord,
  GenerationThread,
  ThemeId,
} from '../types/app';

interface WorkspaceProps {
  activeApi?: ApiConfig;
  apiConfigs: ApiConfig[];
  activeThread: GenerationThread;
  threads: GenerationThread[];
  themeId: ThemeId;
  imageSaveDirectory?: string;
  persistenceMessage?: string;
  onSaveApi: (config: ApiConfig) => Promise<void>;
  onSelectApi: (apiConfigId: string) => Promise<void>;
  onAddThread: () => Promise<void>;
  onSelectThread: (threadId: string) => Promise<void>;
  onAppendThreadRecord: (threadId: string, record: GenerationRecord) => Promise<void>;
  onReplaceThreadRecord: (threadId: string, record: GenerationRecord) => Promise<void>;
  onDeleteThreadRecord: (threadId: string, recordId: string) => Promise<void>;
  onThemeChange: (themeId: ThemeId) => Promise<void>;
  onUpdateImageSaveDirectory: (imageSaveDirectory: string) => Promise<void>;
}

export default function Workspace({
  activeApi,
  apiConfigs,
  activeThread,
  threads,
  themeId,
  imageSaveDirectory,
  persistenceMessage,
  onSaveApi,
  onSelectApi,
  onAddThread,
  onSelectThread,
  onAppendThreadRecord,
  onReplaceThreadRecord,
  onDeleteThreadRecord,
  onThemeChange,
  onUpdateImageSaveDirectory,
}: WorkspaceProps) {
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiConfig | undefined>(activeApi);
  const [previewRecord, setPreviewRecord] = useState<GenerationRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(activeThread.records[0]?.id);
  const [generatingThreadIds, setGeneratingThreadIds] = useState<Set<string>>(() => new Set());

  const selectedRecord = useMemo(() => {
    return activeThread.records.find((record) => record.id === selectedId) ?? activeThread.records[0];
  }, [activeThread.records, selectedId]);

  useEffect(() => {
    setSelectedId(activeThread.records[0]?.id);
  }, [activeThread.id, activeThread.records]);

  const isActiveThreadGenerating = generatingThreadIds.has(activeThread.id);

  async function handleDeleteRecord(recordId: string) {
    if (previewRecord?.id === recordId) setPreviewRecord(null);
    await onDeleteThreadRecord(activeThread.id, recordId);
  }

  async function handleGenerate(params: GenerationParams) {
    if (!activeApi) {
      setIsApiDialogOpen(true);
      return;
    }

    const now = new Date().toISOString();
    const pendingRecord: GenerationRecord = {
      id: crypto.randomUUID(),
      prompt: params.prompt,
      promptSummary: summarizePrompt(params.prompt),
      mode: params.mode,
      model: activeApi.model,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      quality: params.quality,
      status: 'running',
      createdAt: now,
      referenceImagePath: params.referenceImagePath,
      referenceImageDataUrl: params.referenceImageDataUrl,
    };

    setSelectedId(pendingRecord.id);
    setGeneratingThreadIds((current) => new Set(current).add(activeThread.id));
    await onAppendThreadRecord(activeThread.id, pendingRecord);

    try {
      const result = await window.appApi.generateImage({ ...params, imageSaveDirectory }, activeApi);
      const completedRecord: GenerationRecord = {
        ...pendingRecord,
        status: 'succeeded',
        completedAt: new Date().toISOString(),
        imageUrl: result.imageUrl,
        imageDataUrl: result.imageDataUrl,
        imagePath: result.imagePath,
      };
      await onReplaceThreadRecord(activeThread.id, completedRecord);
    } catch (error) {
      const failedRecord: GenerationRecord = {
        ...pendingRecord,
        status: 'failed',
        completedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : '生成失败，请检查 API 设置。',
      };
      await onReplaceThreadRecord(activeThread.id, failedRecord);
    } finally {
      setGeneratingThreadIds((current) => {
        const next = new Set(current);
        next.delete(activeThread.id);
        return next;
      });
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <ImagePlus size={18} />
          </span>
          <div>
            <strong>本地生图工作台</strong>
            <span>Windows local image generator</span>
          </div>
        </div>

        <div className="topbar-status">
          <label className="api-select">
            <span>API</span>
            <select
              value={activeApi?.id ?? ''}
              onChange={(event) => void onSelectApi(event.target.value)}
              disabled={apiConfigs.length === 0}
            >
              {apiConfigs.length === 0 ? (
                <option value="">未配置</option>
              ) : (
                apiConfigs.map((api) => (
                  <option key={api.id} value={api.id}>
                    {api.name} / {api.model}
                  </option>
                ))
              )}
            </select>
          </label>
          <ThemeSwitcher themeId={themeId} onThemeChange={onThemeChange} />
          <button
            className="icon-text-button"
            onClick={() => {
              setEditingApi(activeApi);
              setIsApiDialogOpen(true);
            }}
          >
            <Settings size={16} />
            API 设置
          </button>
          <button
            className="icon-text-button"
            onClick={() => {
              setEditingApi(undefined);
              setIsApiDialogOpen(true);
            }}
          >
            <Plus size={16} />
            新增 API
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <ChatHistory
          threads={threads}
          activeThreadId={activeThread.id}
          generatingThreadIds={generatingThreadIds}
          onAddThread={onAddThread}
          onSelectThread={onSelectThread}
        />

        <section className="center-pane">
          <GenerationCanvas
            record={selectedRecord}
            isGenerating={isActiveThreadGenerating}
            onPreview={(record) => setPreviewRecord(record)}
          />
          <PromptComposer
            activeApi={activeApi}
            apiConfigs={apiConfigs}
            isGenerating={isActiveThreadGenerating}
            onSelectApi={onSelectApi}
            onOpenApiSettings={() => {
              setEditingApi(activeApi);
              setIsApiDialogOpen(true);
            }}
            onGenerate={handleGenerate}
          />
        </section>

        <PreviewGallery
          records={activeThread.records}
          selectedId={selectedRecord?.id}
          onSelect={(record) => setSelectedId(record.id)}
          onPreview={(record) => setPreviewRecord(record)}
          onDeleteRecord={handleDeleteRecord}
        />
      </main>

      {persistenceMessage ? <div className="app-banner error-banner">{persistenceMessage}</div> : null}

      <ApiSettingsDialog
        apiConfig={editingApi}
        apiConfigs={apiConfigs}
        activeApiId={activeApi?.id}
        imageSaveDirectory={imageSaveDirectory}
        isOpen={isApiDialogOpen}
        onClose={() => setIsApiDialogOpen(false)}
        onSave={onSaveApi}
        onEditApi={setEditingApi}
        onNewApi={() => setEditingApi(undefined)}
        onSelectApi={onSelectApi}
        onUpdateImageSaveDirectory={onUpdateImageSaveDirectory}
      />

      <ImagePreviewDialog record={previewRecord} onClose={() => setPreviewRecord(null)} />

      <span className="sr-only">已配置 API 数量：{apiConfigs.length}</span>
    </div>
  );
}
