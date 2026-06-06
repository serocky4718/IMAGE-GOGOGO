import { BookOpen, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { summarizePrompt } from '../lib/options';
import type { PromptPreset, ThreadComposerState } from '../types/app';

interface PromptLibraryDialogProps {
  composer: ThreadComposerState;
  selectedRecord?: {
    imageDataUrl?: string;
    imageUrl?: string;
  };
  presets: PromptPreset[];
  isOpen: boolean;
  onClose: () => void;
  onSavePreset: (title: string, composer: ThreadComposerState, thumbnailSrc?: string) => Promise<void>;
  onApplyPreset: (preset: PromptPreset) => void;
  onDeletePreset: (presetId: string) => Promise<void>;
}

export default function PromptLibraryDialog({
  composer,
  selectedRecord,
  presets,
  isOpen,
  onClose,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}: PromptLibraryDialogProps) {
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const suggestedTitle = useMemo(() => summarizePrompt(composer.prompt), [composer.prompt]);
  const canSave = Boolean(composer.prompt.trim()) && !isSaving;

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      return;
    }

    setTitle(suggestedTitle === '未填写提示词' ? '' : suggestedTitle);
  }, [isOpen, suggestedTitle]);

  if (!isOpen) return null;

  async function handleSave() {
    const nextTitle = title.trim() || suggestedTitle;
    if (!composer.prompt.trim() || nextTitle === '未填写提示词') return;
    const thumbnailSrc =
      selectedRecord?.imageDataUrl ??
      selectedRecord?.imageUrl ??
      composer.referenceImage?.dataUrl;

    setIsSaving(true);
    try {
      await onSavePreset(nextTitle, composer, thumbnailSrc);
      setTitle('');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dialog prompt-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="提示词库"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <strong>提示词库</strong>
            <span>保存当前提示词，并在当前对话快速读取</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="prompt-library-layout">
          <section className="prompt-library-save">
            <strong>保存当前提示词</strong>
            <label className="field-group">
              <span>标题</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="给这条提示词起个名字"
              />
            </label>
            <label className="field-group">
              <span>当前提示词</span>
              <textarea value={composer.prompt} readOnly rows={8} />
            </label>
            <button className="primary-button" disabled={!canSave} onClick={() => void handleSave()}>
              <Save size={16} />
              {isSaving ? '保存中...' : '保存到提示词库'}
            </button>
          </section>

          <section className="prompt-library-list">
            <div className="pane-heading">
              <div>
                <span>已保存</span>
                <strong>{presets.length} 条提示词</strong>
              </div>
            </div>

            {presets.length === 0 ? (
              <div className="empty-block">
                <BookOpen size={28} />
                <p>还没有保存的提示词</p>
                <span>从当前输入区保存后，这里会出现可复用条目。</span>
              </div>
            ) : (
              <div className="prompt-preset-list">
                {presets.map((preset) => (
                  <article key={preset.id} className="prompt-preset-item">
                    <div className="prompt-preset-media">
                      {preset.thumbnailDataUrl ? (
                        <img src={preset.thumbnailDataUrl} alt={preset.title} />
                      ) : (
                        <div className="prompt-preset-fallback">
                          <BookOpen size={18} />
                        </div>
                      )}
                    </div>
                    <div className="prompt-preset-copy">
                      <strong>{preset.title}</strong>
                      <span>{preset.prompt}</span>
                    </div>
                    <div className="prompt-preset-actions">
                      <button
                        className="tiny-button"
                        onClick={() => {
                          onApplyPreset(preset);
                          onClose();
                        }}
                      >
                        读取
                      </button>
                      <button className="icon-button" onClick={() => void onDeletePreset(preset.id)} aria-label="删除">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
