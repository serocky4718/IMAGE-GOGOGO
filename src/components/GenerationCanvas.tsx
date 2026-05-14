import { Eye, ImageIcon, Loader2, TriangleAlert } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { GenerationRecord } from '../types/app';

interface GenerationCanvasProps {
  record?: GenerationRecord;
  isGenerating: boolean;
  onPreview: (record: GenerationRecord) => void;
}

function imageSource(record?: GenerationRecord) {
  return record?.imageDataUrl ?? record?.imageUrl ?? '';
}

export default function GenerationCanvas({ record, isGenerating, onPreview }: GenerationCanvasProps) {
  const src = imageSource(record);
  const hasImage = Boolean(src);
  const isFailed = record?.status === 'failed';

  function openImageMenu(event: MouseEvent) {
    event.preventDefault();
    void window.appApi.showImageContextMenu(record?.imagePath);
  }

  return (
    <section className="canvas-panel">
      <div className="canvas-toolbar">
        <div>
          <span>当前生图区</span>
          <strong>
            {record
              ? `${record.mode === 'image-to-image' ? '图生图' : '文生图'} · ${record.aspectRatio} · ${
                  record.resolution
                } · ${record.quality}`
              : '等待开始'}
          </strong>
        </div>
        <button className="ghost-button" disabled={!record || !hasImage} onClick={() => record && onPreview(record)}>
          <Eye size={16} />
          预览
        </button>
      </div>

      <div className="canvas-stage">
        {hasImage ? (
          <button className="image-stage-button" onClick={() => record && onPreview(record)} onContextMenu={openImageMenu}>
            <img src={src} alt={record?.promptSummary ?? '生成图片'} />
          </button>
        ) : isGenerating ? (
          <div className="empty-block">
            <Loader2 className="spin" size={34} />
            <p>正在生成图片</p>
            <span>第三方 API 响应可能需要一点时间。</span>
          </div>
        ) : isFailed ? (
          <div className="empty-block error">
            <TriangleAlert size={34} />
            <p>生成失败</p>
            <span>{record?.errorMessage}</span>
          </div>
        ) : (
          <div className="empty-block">
            <ImageIcon size={34} />
            <p>选择模式并输入提示词</p>
            <span>生成完成后，图片会显示在这里。</span>
          </div>
        )}
      </div>
    </section>
  );
}
