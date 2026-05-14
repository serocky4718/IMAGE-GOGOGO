import { useEffect, useMemo, useRef, useState } from 'react';
import Workspace from './components/Workspace';
import { emptyState, loadPersistedState, savePersistedState } from './lib/state';
import { supportedApiProtocol } from './lib/api';
import type { ApiConfig, GenerationRecord, GenerationThread, PersistedState, ThemeId } from './types/app';

export default function App() {
  const [state, setState] = useState<PersistedState>(emptyState);
  const stateRef = useRef<PersistedState>(emptyState);
  const [isReady, setIsReady] = useState(false);
  const [persistenceMessage, setPersistenceMessage] = useState<string>();

  useEffect(() => {
    void loadPersistedState()
      .then(({ state: loadedState, warningMessage }) => {
        const normalizedState = normalizeState(loadedState);
        stateRef.current = normalizedState;
        setState(normalizedState);
        setPersistenceMessage(warningMessage);
      })
      .catch(() => setPersistenceMessage('读取本地状态失败，已使用默认工作台继续。'))
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.activeTheme;
  }, [state.settings.activeTheme]);

  const activeApi = useMemo(() => {
    return (
      state.apiConfigs.find((item) => item.id === state.settings.activeApiConfigId) ??
      state.apiConfigs[0]
    );
  }, [state.apiConfigs, state.settings.activeApiConfigId]);

  const activeThread = useMemo(() => {
    return (
      state.threads.find((item) => item.id === state.settings.activeThreadId) ??
      state.threads[0]
    );
  }, [state.settings.activeThreadId, state.threads]);

  async function commit(nextState: PersistedState) {
    stateRef.current = nextState;
    setState(nextState);
    try {
      await savePersistedState(nextState);
      setPersistenceMessage(undefined);
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : '保存本地状态失败，请检查磁盘权限。');
    }
  }

  async function commitUpdate(updater: (current: PersistedState) => PersistedState) {
    const nextState = updater(stateRef.current);
    await commit(nextState);
  }

  async function upsertApiConfig(config: ApiConfig) {
    const exists = state.apiConfigs.some((item) => item.id === config.id);
    const apiConfigs = exists
      ? state.apiConfigs.map((item) => (item.id === config.id ? config : item))
      : [config, ...state.apiConfigs];

    await commit({
      ...state,
      apiConfigs,
      settings: {
        ...state.settings,
        activeApiConfigId: config.id,
      },
    });
  }

  async function selectApiConfig(apiConfigId: string) {
    await commit({
      ...state,
      settings: {
        ...state.settings,
        activeApiConfigId: apiConfigId,
      },
    });
  }

  async function addThread() {
    const nextIndex = state.threads.length + 1;
    const thread: GenerationThread = {
      id: crypto.randomUUID(),
      title: `生成窗口 ${nextIndex}`,
      createdAt: new Date().toISOString(),
      records: [],
    };

    await commit({
      ...state,
      threads: [thread, ...state.threads],
      settings: {
        ...state.settings,
        activeThreadId: thread.id,
      },
    });
  }

  async function selectThread(threadId: string) {
    await commit({
      ...state,
      settings: {
        ...state.settings,
        activeThreadId: threadId,
      },
    });
  }

  async function appendThreadRecord(threadId: string, record: GenerationRecord) {
    await commitUpdate((current) => ({
      ...current,
      threads: current.threads.map((thread) =>
        thread.id === threadId ? { ...thread, records: [record, ...thread.records] } : thread,
      ),
    }));
  }

  async function replaceThreadRecord(threadId: string, record: GenerationRecord) {
    await commitUpdate((current) => ({
      ...current,
      threads: current.threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              records: thread.records.map((item) => (item.id === record.id ? record : item)),
            }
          : thread,
      ),
    }));
  }

  async function deleteThreadRecord(threadId: string, recordId: string) {
    await commitUpdate((current) => ({
      ...current,
      threads: current.threads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              records: thread.records.filter((record) => record.id !== recordId),
            }
          : thread,
      ),
    }));
  }

  async function updateTheme(themeId: ThemeId) {
    await commit({
      ...state,
      settings: {
        ...state.settings,
        activeTheme: themeId,
      },
    });
  }

  async function updateImageSaveDirectory(imageSaveDirectory: string) {
    await commit({
      ...state,
      settings: {
        ...state.settings,
        imageSaveDirectory,
      },
    });
  }

  if (!isReady) {
    return (
      <div className="boot-screen">
        <div className="boot-panel">
          <span className="boot-mark" />
          <p>正在打开本地生图工作台</p>
        </div>
      </div>
    );
  }

  return (
    <Workspace
      activeApi={activeApi}
      apiConfigs={state.apiConfigs}
      activeThread={activeThread}
      threads={state.threads}
      themeId={state.settings.activeTheme}
      imageSaveDirectory={state.settings.imageSaveDirectory}
      onSaveApi={upsertApiConfig}
      onSelectApi={selectApiConfig}
      onAddThread={addThread}
      onSelectThread={selectThread}
      onAppendThreadRecord={appendThreadRecord}
      onReplaceThreadRecord={replaceThreadRecord}
      onDeleteThreadRecord={deleteThreadRecord}
      onThemeChange={updateTheme}
      onUpdateImageSaveDirectory={updateImageSaveDirectory}
      persistenceMessage={persistenceMessage}
    />
  );
}

function normalizeState(nextState: PersistedState): PersistedState {
  const migratedRecords = nextState.records ?? [];
  const fallbackThread: GenerationThread = {
    id: 'default-thread',
    title: '生成窗口 1',
    createdAt: new Date().toISOString(),
    records: migratedRecords,
  };
  const threads = nextState.threads?.length ? nextState.threads : [fallbackThread];
  const activeThreadId =
    nextState.settings?.activeThreadId && threads.some((thread) => thread.id === nextState.settings.activeThreadId)
      ? nextState.settings.activeThreadId
      : threads[0].id;

  return {
    apiConfigs: (nextState.apiConfigs ?? []).map((config) => ({
      ...config,
      protocol: config.protocol ?? supportedApiProtocol,
    })),
    threads,
    settings: {
      activeTheme: nextState.settings?.activeTheme ?? 'cream-pink',
      activeApiConfigId: nextState.settings?.activeApiConfigId,
      activeThreadId,
      imageSaveDirectory: nextState.settings?.imageSaveDirectory,
    },
  };
}
