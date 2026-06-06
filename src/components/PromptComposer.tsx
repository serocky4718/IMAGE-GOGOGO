import { ImagePlus, Loader2, Send, X } from 'lucide-react';
import { useMemo } from 'react';
import { collectCapabilityIssues, formatUnsupportedCapabilityMessage } from '../lib/api';
import { aspectRatios, qualities, resolutions } from '../lib/options';
import type {
  ApiConfig,
  AspectRatio,
  GenerationParams,
  QualityPreset,
  ResolutionPreset,
  ThreadComposerState,
} from '../types/app';

interface PromptComposerProps {
  activeApi?: ApiConfig;
  composer: ThreadComposerState;
  isGenerating: boolean;
  onComposerChange: (composer: ThreadComposerState) => void;
  onOpenPromptLibrary: () => void;
  onOpenApiSettings: () => void;
  onGenerate: (params: GenerationParams) => Promise<void>;
}

export default function PromptComposer({
  activeApi,
  composer,
  isGenerating,
  onComposerChange,
  onOpenPromptLibrary,
  onOpenApiSettings,
  onGenerate,
}: PromptComposerProps) {
  const mode = composer.referenceImage ? 'image-to-image' : 'text-to-image';

  const capabilityIssues = useMemo(() => {
    if (!activeApi) return [];
    return collectCapabilityIssues(
      {
        mode,
        aspectRatio: composer.aspectRatio,
        resolution: composer.resolution,
        quality: composer.quality,
      },
      activeApi.capabilities,
    );
  }, [activeApi, composer.aspectRatio, composer.quality, composer.referenceImage, composer.resolution, mode]);

  const unsupportedCapabilityMessage = useMemo(
    () => formatUnsupportedCapabilityMessage(capabilityIssues),
    [capabilityIssues],
  );
  const unknownCapabilityMessage = useMemo(
    () =>
      capabilityIssues
        .filter((issue) => issue.state === 'unknown')
        .map((issue) => issue.message)
        .join(' '),
    [capabilityIssues],
  );

  const canGenerate = useMemo(() => {
    if (!activeApi || isGenerating || !composer.prompt.trim()) return false;
    if (mode === 'image-to-image' && !composer.referenceImage) return false;
    return true;
  }, [activeApi, composer.prompt, composer.referenceImage, isGenerating, mode]);

  function updateComposer(patch: Partial<ThreadComposerState>) {
    onComposerChange({
      ...composer,
      ...patch,
    });
  }

  async function pickImage() {
    const image = await window.appApi.selectImage();
    if (image) {
      updateComposer({ referenceImage: image });
    }
  }

  async function submit() {
    if (!activeApi) {
      onOpenApiSettings();
      return;
    }

    const params: GenerationParams = {
      mode,
      prompt: composer.prompt,
      referenceImagePath: composer.referenceImage?.path,
      referenceImageDataUrl: composer.referenceImage?.dataUrl,
      aspectRatio: composer.aspectRatio,
      resolution: composer.resolution,
      quality: composer.quality,
      apiConfigId: activeApi.id,
    };

    await onGenerate(params);
  }

  return (
    <section className="composer-panel">
      <div className="control-grid">
        <div className="field-group">
          <span>模式</span>
          <div className="mode-indicator" data-mode={mode}>
            {mode === 'image-to-image' ? '图生图' : '文生图'}
          </div>
        </div>
        <CompactSelect
          label="比例"
          value={composer.aspectRatio}
          options={aspectRatios.map((item) => ({ value: item, label: item }))}
          onChange={(value) => updateComposer({ aspectRatio: value as AspectRatio })}
        />
        <CompactSelect
          label="分辨率"
          value={composer.resolution}
          options={resolutions.map((item) => ({ value: item, label: item }))}
          onChange={(value) => updateComposer({ resolution: value as ResolutionPreset })}
        />
        <CompactSelect
          label="quality"
          value={composer.quality}
          options={qualities.map((item) => ({ value: item, label: item }))}
          onChange={(value) => updateComposer({ quality: value as QualityPreset })}
        />
      </div>

      <div className="reference-strip">
        <button className="ghost-button" onClick={pickImage}>
          <ImagePlus size={16} />
          {composer.referenceImage ? '更换参考图' : '添加参考图'}
        </button>
        <button className="tiny-button" onClick={onOpenPromptLibrary}>
          提示词库
        </button>
        {composer.referenceImage ? (
          <div className="reference-preview">
            <img src={composer.referenceImage.dataUrl} alt={composer.referenceImage.name} />
            <span>{composer.referenceImage.name}</span>
            <button onClick={() => updateComposer({ referenceImage: undefined })} aria-label="移除参考图">
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="muted">添加参考图后会自动切换为图生图</span>
        )}
      </div>

      {unsupportedCapabilityMessage ? (
        <div className="inline-feedback error">{unsupportedCapabilityMessage}</div>
      ) : null}
      {!unsupportedCapabilityMessage && unknownCapabilityMessage ? (
        <div className="inline-feedback warning">{unknownCapabilityMessage}</div>
      ) : null}

      <div className="prompt-box">
        <textarea
          value={composer.prompt}
          onChange={(event) => updateComposer({ prompt: event.target.value })}
          placeholder="描述你想生成的画面..."
          rows={4}
        />
        <button className="primary-button" disabled={!canGenerate} onClick={submit}>
          {isGenerating ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          {activeApi ? '生成' : '先配置 API'}
        </button>
      </div>
    </section>
  );
}

interface CompactSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function CompactSelect({ label, value, options, onChange }: CompactSelectProps) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
