export type CapabilityState = 'supported' | 'unsupported' | 'unknown';

export type GenerationMode = 'text-to-image' | 'image-to-image';
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | '2:1';
export type ResolutionPreset = '1K' | '2K' | '4K';
export type QualityPreset = 'low' | 'medium' | 'high';
export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type ThemeId = 'cream-pink' | 'obsidian-gold' | 'cloud-blue' | 'aurora-cyan' | 'graphite-pink';

export interface ApiCapabilities {
  textToImage: CapabilityState;
  imageToImage: CapabilityState;
  aspectRatio: CapabilityState;
  resolution: CapabilityState;
  quality: CapabilityState;
}

export interface ApiConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  protocol: 'openai-compatible-images';
  capabilities: ApiCapabilities;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationParams {
  mode: GenerationMode;
  prompt: string;
  referenceImagePath?: string;
  referenceImageDataUrl?: string;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  quality: QualityPreset;
  apiConfigId: string;
  imageSaveDirectory?: string;
}

export interface GenerationRecord {
  id: string;
  prompt: string;
  promptSummary: string;
  mode: GenerationMode;
  model: string;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  quality: QualityPreset;
  status: GenerationStatus;
  createdAt: string;
  completedAt?: string;
  imageUrl?: string;
  imagePath?: string;
  imageDataUrl?: string;
  referenceImagePath?: string;
  referenceImageDataUrl?: string;
  errorMessage?: string;
}

export interface ThreadComposerState {
  prompt: string;
  referenceImage?: SelectedImage;
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  quality: QualityPreset;
}

export interface GenerationThread {
  id: string;
  title: string;
  createdAt: string;
  records: GenerationRecord[];
  composer: ThreadComposerState;
}

export interface PromptPreset {
  id: string;
  title: string;
  prompt: string;
  thumbnailDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  activeTheme: ThemeId;
  activeApiConfigId?: string;
  activeThreadId?: string;
  imageSaveDirectory?: string;
}

export interface PersistedState {
  apiConfigs: ApiConfig[];
  records?: GenerationRecord[];
  threads: GenerationThread[];
  promptPresets: PromptPreset[];
  settings: AppSettings;
}

export interface SelectedImage {
  path: string;
  name: string;
  dataUrl: string;
}

export interface GenerateImageResult {
  imageUrl?: string;
  imageDataUrl?: string;
  imagePath?: string;
  raw?: unknown;
}

export interface StateLoadResult {
  state: PersistedState;
  warningMessage?: string;
}

export interface AppApi {
  selectImage: () => Promise<SelectedImage | null>;
  selectDirectory: () => Promise<string | null>;
  loadState: () => Promise<StateLoadResult>;
  saveState: (state: PersistedState) => Promise<PersistedState>;
  generateImage: (params: GenerationParams, config: ApiConfig) => Promise<GenerateImageResult>;
  openImageFolder: (imagePath?: string) => Promise<void>;
  showImageContextMenu: (imagePath?: string) => Promise<void>;
}

export const defaultCapabilities: ApiCapabilities = {
  textToImage: 'unknown',
  imageToImage: 'unknown',
  aspectRatio: 'unknown',
  resolution: 'unknown',
  quality: 'unknown',
};

export const defaultSettings: AppSettings = {
  activeTheme: 'cream-pink',
};
