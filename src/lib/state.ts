import { defaultSettings, type PersistedState, type StateLoadResult } from '../types/app';

export const emptyState: PersistedState = {
  apiConfigs: [],
  threads: [
    {
      id: 'default-thread',
      title: '生成窗口 1',
      createdAt: new Date().toISOString(),
      records: [],
    },
  ],
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
