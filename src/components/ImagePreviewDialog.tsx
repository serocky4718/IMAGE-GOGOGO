import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { GenerationRecord } from '../types/app';

interface ImagePreviewDialogProps {
  record: GenerationRecord | null;
  onClose: () => void;
}

export default function ImagePreviewDialog({ record, onClose }: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const src = record?.imageDataUrl ?? record?.imageUrl ?? record?.referenceImageDataUrl;
  const isGeneratedImage = Boolean(record?.imageDataUrl ?? record?.imageUrl);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
  }, [record?.id, src]);

  useEffect(() => {
    if (!isDragging) return undefined;

    function handlePointerUp() {
      setIsDragging(false);
    }

    function handlePointerMove(event: MouseEvent) {
      setOffset({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      });
    }

    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);
    return () => {
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [dragStart.x, dragStart.y, isDragging]);

  const scaleLabel = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

  if (!record || !src) return null;

  function openImageMenu(event: ReactMouseEvent) {
    event.preventDefault();
    void window.appApi.showImageContextMenu(record?.imagePath);
  }

  function resetView() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  function updateScale(nextScale: number) {
    setScale(Math.min(5, Math.max(0.25, Number(nextScale.toFixed(2)))));
  }

  function startDrag(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    });
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dialog preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <strong>图片预览</strong>
            <span>
              {record.mode === 'image-to-image' ? '图生图' : '文生图'} · {isGeneratedImage ? '生成图' : '参考图'}
            </span>
          </div>
          <div className="preview-toolbar">
            <button className="icon-button" onClick={() => updateScale(scale - 0.25)} aria-label="缩小">
              <Minus size={16} />
            </button>
            <span>{scaleLabel}</span>
            <button className="icon-button" onClick={() => updateScale(scale + 0.25)} aria-label="放大">
              <Plus size={16} />
            </button>
            <button className="tiny-button" onClick={resetView}>
              <RotateCcw size={14} />
              重置
            </button>
            <button className="icon-button" onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </div>
        </header>

        <div
          className={`preview-large ${isDragging ? 'is-dragging' : ''}`}
          onContextMenu={openImageMenu}
          onMouseDown={startDrag}
        >
          <img
            src={src}
            alt={record.promptSummary}
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
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
