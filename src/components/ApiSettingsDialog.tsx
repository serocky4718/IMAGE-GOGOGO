import { FolderOpen, KeyRound, Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiProtocolLabel, capabilityLabels, isValidHttpUrl, supportedApiProtocol } from '../lib/api';
import { defaultCapabilities, type ApiConfig, type CapabilityState } from '../types/app';

interface ApiSettingsDialogProps {
  apiConfig?: ApiConfig;
  apiConfigs: ApiConfig[];
  activeApiId?: string;
  imageSaveDirectory?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ApiConfig) => Promise<void>;
  onEditApi: (config: ApiConfig | undefined) => void;
  onNewApi: () => void;
  onSelectApi: (apiConfigId: string) => Promise<void>;
  onUpdateImageSaveDirectory: (imageSaveDirectory: string) => Promise<void>;
}

const capabilityOptions: CapabilityState[] = ['supported', 'unsupported', 'unknown'];

export default function ApiSettingsDialog({
  apiConfig,
  apiConfigs,
  activeApiId,
  imageSaveDirectory,
  isOpen,
  onClose,
  onSave,
  onEditApi,
  onNewApi,
  onSelectApi,
  onUpdateImageSaveDirectory,
}: ApiSettingsDialogProps) {
  const [draft, setDraft] = useState<ApiConfig>(() => createDraft(apiConfig));
  const endpointError =
    draft.endpoint.trim().length > 0 && !isValidHttpUrl(draft.endpoint.trim())
      ? '请输入有效的 http/https API 地址。'
      : '';

  useEffect(() => {
    if (isOpen) setDraft(createDraft(apiConfig));
  }, [apiConfig, isOpen]);

  if (!isOpen) return null;

  async function save() {
    const now = new Date().toISOString();
    await onSave({
      ...draft,
      updatedAt: now,
      createdAt: draft.createdAt || now,
    });
    onClose();
  }

  async function chooseImageSaveDirectory() {
    const directory = await window.appApi.selectDirectory();
    if (directory) await onUpdateImageSaveDirectory(directory);
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog api-dialog" role="dialog" aria-modal="true" aria-label="API 设置">
        <header className="dialog-header">
          <div>
            <KeyRound size={18} />
            <strong>API 供应商设置</strong>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="api-settings-layout">
          <aside className="api-provider-list">
            <button
              className={`api-provider-item ${!apiConfig ? 'is-selected' : ''}`}
              onClick={() => {
                onNewApi();
                setDraft(createDraft());
              }}
            >
              <Plus size={16} />
              <span>新增供应商</span>
            </button>
            {apiConfigs.map((item) => (
              <button
                key={item.id}
                className={`api-provider-item ${draft.id === item.id ? 'is-selected' : ''}`}
                onClick={() => {
                  onEditApi(item);
                  setDraft(createDraft(item));
                }}
              >
                <span>
                  <strong>{item.name}</strong>
                  <em>{item.model || '未设置模型'}</em>
                </span>
                {activeApiId === item.id ? <b>当前</b> : null}
              </button>
            ))}
          </aside>

          <section className="api-edit-panel">
            <div className="settings-box">
              <strong>图片保存位置</strong>
              <div className="directory-row">
                <input value={imageSaveDirectory || '默认保存到系统图片目录'} readOnly />
                <button className="icon-text-button" onClick={chooseImageSaveDirectory}>
                  <FolderOpen size={16} />
                  选择目录
                </button>
              </div>
            </div>

            <div className="settings-box">
              <strong>首版支持协议</strong>
              <div className="protocol-note">
                <b>{apiProtocolLabel}</b>
                <span>当前版本按固定协议发送请求并解析 `url` / `b64_json` 返回值。</span>
              </div>
            </div>

            <div className="form-grid">
              <label>
                服务名称
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="自定义 API"
                />
              </label>
              <label>
                API 地址
                <input
                  value={draft.endpoint}
                  onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })}
                  placeholder="https://api.example.com/v1/images/generations"
                />
                {endpointError ? <span className="field-error">{endpointError}</span> : null}
              </label>
              <label>
                认证信息
                <input
                  value={draft.apiKey}
                  type="password"
                  onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
                  placeholder="API Key"
                />
              </label>
              <label>
                模型名称
                <input
                  value={draft.model}
                  onChange={(event) => setDraft({ ...draft, model: event.target.value })}
                  placeholder="model-name"
                />
              </label>
            </div>

            <div className="capability-box">
              <strong>能力边界</strong>
              <CapabilitySelect label="文生图" value={draft.capabilities.textToImage} onChange={(value) =>
                setDraft({ ...draft, capabilities: { ...draft.capabilities, textToImage: value } })
              } />
              <CapabilitySelect label="图生图" value={draft.capabilities.imageToImage} onChange={(value) =>
                setDraft({ ...draft, capabilities: { ...draft.capabilities, imageToImage: value } })
              } />
              <CapabilitySelect label="尺寸比例" value={draft.capabilities.aspectRatio} onChange={(value) =>
                setDraft({ ...draft, capabilities: { ...draft.capabilities, aspectRatio: value } })
              } />
              <CapabilitySelect label="分辨率" value={draft.capabilities.resolution} onChange={(value) =>
                setDraft({ ...draft, capabilities: { ...draft.capabilities, resolution: value } })
              } />
              <CapabilitySelect label="quality" value={draft.capabilities.quality} onChange={(value) =>
                setDraft({ ...draft, capabilities: { ...draft.capabilities, quality: value } })
              } />
            </div>
          </section>
        </div>

        <footer className="dialog-actions">
          <button className="ghost-button" onClick={onClose}>
            取消
          </button>
          {apiConfigs.some((item) => item.id === draft.id) ? (
            <button className="ghost-button" onClick={() => void onSelectApi(draft.id)}>
              设为当前
            </button>
          ) : null}
          <button
            className="primary-button"
            onClick={save}
            disabled={!draft.name || !draft.endpoint || !draft.model || Boolean(endpointError)}
          >
            <Save size={16} />
            保存配置
          </button>
        </footer>
      </section>
    </div>
  );
}

function createDraft(config?: ApiConfig): ApiConfig {
  const now = new Date().toISOString();
  if (config) {
    return {
      ...config,
      protocol: config.protocol ?? supportedApiProtocol,
    };
  }

  return {
    id: crypto.randomUUID(),
    name: '自定义 API',
    endpoint: '',
    apiKey: '',
    model: '',
    protocol: supportedApiProtocol,
    capabilities: defaultCapabilities,
    createdAt: now,
    updatedAt: now,
  };
}

interface CapabilitySelectProps {
  label: string;
  value: CapabilityState;
  onChange: (value: CapabilityState) => void;
}

function CapabilitySelect({ label, value, onChange }: CapabilitySelectProps) {
  return (
    <label className="capability-select">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as CapabilityState)}>
        {capabilityOptions.map((option) => (
          <option key={option} value={option}>
            {capabilityLabels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
