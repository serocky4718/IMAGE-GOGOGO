import {
  defaultSettings,
  type GenerationThread,
  type PersistedState,
  type StateLoadResult,
  type ThreadComposerState,
} from '../types/app';

export function createDefaultComposerState(): ThreadComposerState {
  return {
    prompt: '',
    aspectRatio: '16:9',
    resolution: '1K',
    quality: 'medium',
  };
}

export function createThread(threadIndex: number): GenerationThread {
  return {
    id: crypto.randomUUID(),
    title: `生成窗口 ${threadIndex}`,
    createdAt: new Date().toISOString(),
    records: [],
    composer: createDefaultComposerState(),
  };
}

export const emptyState: PersistedState = {
  apiConfigs: [],
  threads: [
    {
      id: 'default-thread',
      title: '生成窗口 1',
      createdAt: new Date().toISOString(),
      records: [],
      composer: createDefaultComposerState(),
    },
  ],
  promptPresets: [],
  settings: defaultSettings,
};

export async function loadPersistedState(): Promise<StateLoadResult> {
  if (!window.appApi) return { state: emptyState };
  return window.appApi.loadState();
}

export async function savePersistedState(state: PersistedState): Promise<PersistedState> {
  if (!window.appApi) return state;
  return window.appApi.saveState(state);
}
