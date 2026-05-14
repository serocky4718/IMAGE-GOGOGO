import { ImagePlus, Loader2, Send, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { collectCapabilityIssues, formatUnsupportedCapabilityMessage } from '../lib/api';
import { aspectRatios, qualities, resolutions } from '../lib/options';
import type {
  ApiConfig,
  AspectRatio,
  GenerationMode,
  GenerationParams,
  QualityPreset,
  ResolutionPreset,
  SelectedImage,
} from '../types/app';

interface PromptComposerProps {
  activeApi?: ApiConfig;
  apiConfigs: ApiConfig[];
  isGenerating: boolean;
  onSelectApi: (apiConfigId: string) => Promise<void>;
  onOpenApiSettings: () => void;
  onGenerate: (params: GenerationParams) => Promise<void>;
}

export default function PromptComposer({
  activeApi,
  apiConfigs,
  isGenerating,
  onSelectApi,
  onOpenApiSettings,
  onGenerate,
}: PromptComposerProps) {
  const [mode, setMode] = useState<GenerationMode>('text-to-image');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<ResolutionPreset>('1K');
  const [quality, setQuality] = useState<QualityPreset>('medium');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<SelectedImage | null>(null);

  const capabilityIssues = useMemo(() => {
    if (!activeApi) return [];
    return collectCapabilityIssues({ mode, aspectRatio, resolution, quality }, activeApi.capabilities);
  }, [activeApi, aspectRatio, mode, quality, resolution]);

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
    if (!activeApi || isGenerating || !prompt.trim()) return false;
    if (mode === 'image-to-image' && !referenceImage) return false;
    return true;
  }, [activeApi, isGenerating, mode, prompt, referenceImage]);

  async function pickImage() {
    const image = await window.appApi.selectImage();
    if (image) {
      setReferenceImage(image);
      setMode('image-to-image');
    }
  }

  async function submit() {
    if (!activeApi) {
      onOpenApiSettings();
      return;
    }

    const params: GenerationParams = {
      mode,
      prompt,
      referenceImagePath: referenceImage?.path,
      referenceImageDataUrl: referenceImage?.dataUrl,
      aspectRatio,
      resolution,
      quality,
      apiConfigId: activeApi.id,
    };

    await onGenerate(params);
  }

  return (
    <section className="composer-panel">
      <div className="api-summary">
        <label className="composer-api-select">
          <span>当前 API</span>
          <select
            value={activeApi?.id ?? ''}
            onChange={(event) => void onSelectApi(event.target.value)}
            disabled={apiConfigs.length === 0}
          >
            {apiConfigs.length === 0 ? (
              <option value="">未配置，点击设置</option>
            ) : (
              apiConfigs.map((api) => (
                <option key={api.id} value={api.id}>
                  {api.name} / {api.model}
                </option>
              ))
            )}
          </select>
        </label>
        <span className="capability-hint">
          参数边界：
          {activeApi ? `模式 ${activeApi.capabilities.textToImage}/${activeApi.capabilities.imageToImage}` : '未知'}
        </span>
        <button className="tiny-button" onClick={onOpenApiSettings}>
          管理
        </button>
      </div>

      <div className="control-row">
        <SegmentedControl
          label="模式"
          value={mode}
          options={[
            { value: 'text-to-image', label: '文生图' },
            { value: 'image-to-image', label: '图生图' },
          ]}
          onChange={(value) => setMode(value as GenerationMode)}
        />
        <SegmentedControl
          label="比例"
          value={aspectRatio}
          options={aspectRatios.map((item) => ({ value: item, label: item }))}
          onChange={(value) => setAspectRatio(value as AspectRatio)}
        />
      </div>

      <div className="control-row">
        <SegmentedControl
          label="分辨率"
          value={resolution}
          options={resolutions.map((item) => ({ value: item, label: item }))}
          onChange={(value) => setResolution(value as ResolutionPreset)}
        />
        <SegmentedControl
          label="quality"
          value={quality}
          options={qualities.map((item) => ({ value: item, label: item }))}
          onChange={(value) => setQuality(value as QualityPreset)}
        />
      </div>

      <div className="reference-strip">
        <button className="ghost-button" onClick={pickImage}>
          <ImagePlus size={16} />
          {referenceImage ? '更换参考图' : '添加参考图'}
        </button>
        {referenceImage ? (
          <div className="reference-preview">
            <img src={referenceImage.dataUrl} alt={referenceImage.name} />
            <span>{referenceImage.name}</span>
            <button onClick={() => setReferenceImage(null)} aria-label="移除参考图">
              <X size={14} />
            </button>
          </div>
        ) : (
          <span className="muted">图生图模式需要参考图片</span>
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
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
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

interface SegmentedControlProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function SegmentedControl({ label, value, options, onChange }: SegmentedControlProps) {
  return (
    <div className="segmented-group">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            className={value === option.value ? 'is-active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
