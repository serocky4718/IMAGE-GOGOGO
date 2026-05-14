import { Clock3, Plus, Rows3 } from 'lucide-react';
import type { GenerationThread } from '../types/app';

interface ChatHistoryProps {
  threads: GenerationThread[];
  activeThreadId: string;
  generatingThreadIds: Set<string>;
  onAddThread: () => Promise<void>;
  onSelectThread: (threadId: string) => Promise<void>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function latestSummary(thread: GenerationThread) {
  const latest = thread.records[0];
  if (!latest) return '还没有生成记录';
  if (latest.status === 'running') return `生成中：${latest.promptSummary}`;
  if (latest.status === 'failed') return `失败：${latest.promptSummary}`;
  return latest.promptSummary;
}

export default function ChatHistory({
  threads,
  activeThreadId,
  generatingThreadIds,
  onAddThread,
  onSelectThread,
}: ChatHistoryProps) {
  return (
    <aside className="history-pane thread-pane">
      <div className="pane-heading">
        <div>
          <span>生成窗口</span>
          <strong>{threads.length}</strong>
        </div>
        <button className="tiny-button" onClick={() => void onAddThread()}>
          <Plus size={14} />
          新增
        </button>
      </div>

      <div className="history-list thread-list">
        {threads.map((thread) => {
          const isGenerating = generatingThreadIds.has(thread.id);
          return (
            <button
              key={thread.id}
              className={`thread-item ${activeThreadId === thread.id ? 'is-selected' : ''}`}
              onClick={() => void onSelectThread(thread.id)}
            >
              <span className={`thread-status ${isGenerating ? 'status-running' : ''}`}>
                <Rows3 size={16} />
              </span>
              <span className="thread-copy">
                <strong>{thread.title}</strong>
                <span>{latestSummary(thread)}</span>
              </span>
              <span className="thread-meta">
                <Clock3 size={13} />
                {formatTime(thread.createdAt)} · {thread.records.length} 张
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
