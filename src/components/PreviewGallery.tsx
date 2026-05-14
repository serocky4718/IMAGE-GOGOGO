import { Eye, FolderOpen, ImageIcon, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { GenerationRecord } from '../types/app';

interface PreviewGalleryProps {
  records: GenerationRecord[];
  selectedId?: string;
  onSelect: (record: GenerationRecord) => void;
  onPreview: (record: GenerationRecord) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
}

interface RecordMenuState {
  x: number;
  y: number;
  record: GenerationRecord;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function PreviewGallery({
  records,
  selectedId,
  onSelect,
  onPreview,
  onDeleteRecord,
}: PreviewGalleryProps) {
  const [recordMenu, setRecordMenu] = useState<RecordMenuState | null>(null);

  useEffect(() => {
    if (!recordMenu) return undefined;

    function closeMenu() {
      setRecordMenu(null);
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeWithEscape);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [recordMenu]);

  function openRecordMenu(event: MouseEvent, record: GenerationRecord) {
    event.preventDefault();
    setRecordMenu({
      x: Math.min(event.clientX, window.innerWidth - 190),
      y: Math.min(event.clientY, window.innerHeight - 108),
      record,
    });
  }

  async function deleteRecord(recordId: string) {
    setRecordMenu(null);
    await onDeleteRecord(recordId);
  }

  return (
    <aside className="preview-pane">
      <div className="pane-heading">
        <div>
          <span>图片预览</span>
          <strong>生成记录</strong>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="empty-block">
          <ImageIcon size={28} />
          <p>暂无图片</p>
          <span>生成成功后会出现在这里。</span>
        </div>
      ) : (
        <div className="preview-grid">
          {records.map((record) => {
            const src = record.imageDataUrl ?? record.imageUrl;
            return (
              <article
                key={record.id}
                className={`preview-item ${selectedId === record.id ? 'is-selected' : ''}`}
                onContextMenu={(event) => openRecordMenu(event, record)}
              >
                <button
                  className="preview-thumb"
                  onClick={() => onSelect(record)}
                  onContextMenu={(event) => openRecordMenu(event, record)}
                >
                  {src ? <img src={src} alt={record.promptSummary} /> : <ImageIcon size={28} />}
                  <span className={`preview-status status-${record.status}`}>{record.status}</span>
                </button>
                <div className="preview-info">
                  <strong>{record.promptSummary}</strong>
                  <span>{record.model}</span>
                  <span>
                    {record.aspectRatio} · {record.resolution} · {record.quality}
                  </span>
                  <span>{formatDate(record.createdAt)}</span>
                </div>
                <button className="tiny-button" disabled={!src} onClick={() => onPreview(record)}>
                  <Eye size={14} />
                  查看
                </button>
              </article>
            );
          })}
        </div>
      )}

      {recordMenu ? (
        <div
          className="record-context-menu"
          style={{ left: recordMenu.x, top: recordMenu.y }}
          onClick={(event) => event.stopPropagation()}
          role="menu"
        >
          <button
            disabled={!recordMenu.record.imagePath}
            onClick={() => {
              setRecordMenu(null);
              void window.appApi.openImageFolder(recordMenu.record.imagePath);
            }}
            role="menuitem"
          >
            <FolderOpen size={15} />
            打开文件夹
          </button>
          <button className="danger" onClick={() => void deleteRecord(recordMenu.record.id)} role="menuitem">
            <Trash2 size={15} />
            删除记录
          </button>
        </div>
      ) : null}
    </aside>
  );
}
