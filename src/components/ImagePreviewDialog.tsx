import { X } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { GenerationRecord } from '../types/app';

interface ImagePreviewDialogProps {
  record: GenerationRecord | null;
  onClose: () => void;
}

export default function ImagePreviewDialog({ record, onClose }: ImagePreviewDialogProps) {
  if (!record) return null;

  const isGeneratedImage = Boolean(record.imageDataUrl ?? record.imageUrl);
  const src = record.imageDataUrl ?? record.imageUrl ?? record.referenceImageDataUrl;
  if (!src) return null;

  function openImageMenu(event: MouseEvent) {
    event.preventDefault();
    void window.appApi.showImageContextMenu(record?.imagePath);
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog preview-dialog" role="dialog" aria-modal="true" aria-label="图片预览">
        <header className="dialog-header">
          <div>
            <strong>图片预览</strong>
            <span>
              {record.mode === 'image-to-image' ? '图生图' : '文生图'} · {isGeneratedImage ? '生成图' : '参考图'}
            </span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="preview-large" onContextMenu={openImageMenu}>
          <img src={src} alt={record.promptSummary} />
        </div>

        <footer className="preview-footer">
          <strong>{record.promptSummary}</strong>
          <span>
            {isGeneratedImage ? '生成图' : '参考图'} / {record.model} / {record.aspectRatio} / {record.resolution} /{' '}
            {record.quality}
          </span>
        </footer>
      </section>
    </div>
  );
}
