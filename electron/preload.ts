import { contextBridge, ipcRenderer } from 'electron';
import type { ApiConfig, AppApi, GenerationParams, PersistedState } from '../src/types/app';

const appApi: AppApi = {
  selectImage: () => ipcRenderer.invoke('image:select'),
  selectDirectory: () => ipcRenderer.invoke('directory:select'),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state: PersistedState) => ipcRenderer.invoke('state:save', state),
  generateImage: (params: GenerationParams, config: ApiConfig) =>
    ipcRenderer.invoke('image:generate', params, config),
  openImageFolder: (imagePath?: string) => ipcRenderer.invoke('image:open-folder', imagePath),
  showImageContextMenu: (imagePath?: string) => ipcRenderer.invoke('image:context-menu', imagePath),
};

contextBridge.exposeInMainWorld('appApi', appApi);
