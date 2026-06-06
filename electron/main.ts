import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type OpenDialogOptions } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isValidHttpUrl, supportedApiProtocol } from '../src/lib/api';
import { fetchWithTimeout, requestOpenAiCompatibleImage } from '../src/lib/image-generation';
import { createDefaultComposerState } from '../src/lib/state';
import type {
  ApiConfig,
  GenerateImageResult,
  GenerationParams,
  PersistedState,
  SelectedImage,
  StateLoadResult,
} from '../src/types/app';
import { defaultSettings } from '../src/types/app';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const REQUEST_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 20_000;

let mainWindow: BrowserWindow | null = null;

function getStatePath() {
  return path.join(app.getPath('userData'), 'state.json');
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function readStateFile(filePath: string): Promise<StateLoadResult> {
  try {
    return {
      state: await readJsonFile<PersistedState>(filePath),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { state: createEmptyState() };
    }

    const backupPath = `${filePath}.corrupted-${Date.now()}.bak`;
    try {
      await fs.copyFile(filePath, backupPath);
    } catch {
      // noop
    }

    return {
      state: createEmptyState(),
      warningMessage: `本地状态文件读取失败，已回退到默认工作室，并备份损坏文件到 ${backupPath}。`,
    };
  }
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<T> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
  return value;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: 'Rocky的图片工作室',
    backgroundColor: '#fff7fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

function createEmptyState(): PersistedState {
  const threadId = 'default-thread';
  return {
    apiConfigs: [],
    threads: [
      {
        id: threadId,
        title: '生成窗口 1',
        createdAt: new Date().toISOString(),
        records: [],
        composer: createDefaultComposerState(),
      },
    ],
    promptPresets: [],
    settings: {
      ...defaultSettings,
      activeThreadId: threadId,
      imageSaveDirectory: path.join(app.getPath('pictures'), 'Rocky的图片工作室'),
    },
  };
}

function normalizeSize(params: GenerationParams): string {
  const sizeMap: Record<string, Record<string, string>> = {
    '1K': {
      '1:1': '1024x1024',
      '4:3': '1024x768',
      '3:4': '768x1024',
      '16:9': '1280x720',
      '9:16': '720x1280',
      '3:2': '1152x768',
      '2:3': '768x1152',
      '2:1': '1536x768',
    },
    '2K': {
      '1:1': '2048x2048',
      '4:3': '2048x1536',
      '3:4': '1536x2048',
      '16:9': '2560x1440',
      '9:16': '1440x2560',
      '3:2': '2304x1536',
      '2:3': '1536x2304',
      '2:1': '3072x1536',
    },
    '4K': {
      '1:1': '4096x4096',
      '4:3': '4096x3072',
      '3:4': '3072x4096',
      '16:9': '3840x2160',
      '9:16': '2160x3840',
      '3:2': '4608x3072',
      '2:3': '3072x4608',
      '2:1': '6144x3072',
    },
  };

  return sizeMap[params.resolution]?.[params.aspectRatio] ?? '1024x1024';
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('生成失败，请检查 API 配置、网络状态或参数支持情况。');
}

function safeFilePart(value: string): string {
  const cleaned = value.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'generated-image').slice(0, 36);
}

function parseDataUrl(dataUrl: string): { bytes: Buffer; extension: string } {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) throw new Error('无法解析 base64 图片数据。');
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  return {
    bytes: Buffer.from(match[2], 'base64'),
    extension,
  };
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) return 'png';
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'png';
}

async function saveGeneratedImage(result: GenerateImageResult, params: GenerationParams): Promise<string | undefined> {
  const saveDirectory = params.imageSaveDirectory || path.join(app.getPath('pictures'), 'Rocky的图片工作室');
  await fs.mkdir(saveDirectory, { recursive: true });

  let bytes: Buffer;
  let extension = 'png';

  if (result.imageDataUrl) {
    const parsed = parseDataUrl(result.imageDataUrl);
    bytes = parsed.bytes;
    extension = parsed.extension;
  } else if (result.imageUrl) {
    const response = await fetchWithTimeout(
      result.imageUrl,
      { method: 'GET' },
      DOWNLOAD_TIMEOUT_MS,
      '下载生成图片超时，请稍后重试。',
    );
    if (!response.ok) throw new Error(`图片下载失败 (${response.status})。`);
    const arrayBuffer = await response.arrayBuffer();
    bytes = Buffer.from(arrayBuffer);
    extension = extensionFromContentType(response.headers.get('content-type'));
  } else {
    return undefined;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${safeFilePart(params.prompt)}.${extension}`;
  const filePath = path.join(saveDirectory, filename);
  await fs.writeFile(filePath, bytes);
  return filePath;
}

async function generateImage(params: GenerationParams, config: ApiConfig): Promise<GenerateImageResult> {
  validateGenerateInputs(params, config);

  try {
    const result = await requestOpenAiCompatibleImage(params, config, {
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      requestTimeoutMessage: '请求超时，请检查第三方 API 是否可用或稍后重试。',
      normalizeSize,
    });

    const imagePath = await saveGeneratedImage(result, params);
    return {
      ...result,
      imagePath,
    };
  } catch (error) {
    throw normalizeError(error);
  }
}

function validateCapabilityValues(config: ApiConfig) {
  const capabilityValues = Object.values(config.capabilities);
  if (!capabilityValues.every((value) => value === 'supported' || value === 'unsupported' || value === 'unknown')) {
    throw new Error('API 能力边界配置无效。');
  }
}

function validateImageToImageReference(params: GenerationParams) {
  if (params.mode === 'image-to-image' && !params.referenceImageDataUrl) {
    throw new Error('图生图模式需要先选择参考图片。');
  }
}

function validateBasicGenerateInputs(params: GenerationParams, config: ApiConfig) {
  if (!config.endpoint) throw new Error('API 地址未配置。');
  if (!config.model) throw new Error('模型名称未配置。');
  if (!params.prompt.trim()) throw new Error('提示词不能为空。');
  validateImageToImageReference(params);
  validateCapabilityValues(config);
}

function validateGenerateInputs(params: unknown, config: unknown) {
  validateGenerationParams(params);
  validateApiConfig(config);
  validateBasicGenerateInputs(params, config);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateApiConfig(config: unknown): asserts config is ApiConfig {
  if (!isPlainObject(config)) throw new Error('API 配置格式无效。');
  if (typeof config.id !== 'string' || typeof config.name !== 'string' || typeof config.model !== 'string') {
    throw new Error('API 配置缺少必要字段。');
  }
  if (typeof config.endpoint !== 'string' || !isValidHttpUrl(config.endpoint)) {
    throw new Error('API 地址格式不正确，请填写有效的 http/https URL。');
  }
  if (config.protocol !== supportedApiProtocol) {
    throw new Error('当前版本仅支持 OpenAI-compatible 图片接口。');
  }
  if (!isPlainObject(config.capabilities)) {
    throw new Error('API 能力边界配置无效。');
  }
}

function validateGenerationParams(params: unknown): asserts params is GenerationParams {
  if (!isPlainObject(params)) throw new Error('生成参数格式无效。');
  if (params.mode !== 'text-to-image' && params.mode !== 'image-to-image') {
    throw new Error('生成模式无效。');
  }
  if (typeof params.prompt !== 'string') throw new Error('提示词格式无效。');
  if (
    params.aspectRatio !== '1:1' &&
    params.aspectRatio !== '4:3' &&
    params.aspectRatio !== '3:4' &&
    params.aspectRatio !== '16:9' &&
    params.aspectRatio !== '9:16' &&
    params.aspectRatio !== '3:2' &&
    params.aspectRatio !== '2:3' &&
    params.aspectRatio !== '2:1'
  ) {
    throw new Error('尺寸比例无效。');
  }
  if (params.resolution !== '1K' && params.resolution !== '2K' && params.resolution !== '4K') {
    throw new Error('分辨率无效。');
  }
  if (params.quality !== 'low' && params.quality !== 'medium' && params.quality !== 'high') {
    throw new Error('quality 参数无效。');
  }
}

function validatePersistedState(state: unknown): asserts state is PersistedState {
  if (!isPlainObject(state) || !Array.isArray(state.apiConfigs) || !Array.isArray(state.threads) || !isPlainObject(state.settings)) {
    throw new Error('本地状态格式无效，无法保存。');
  }
}

app.whenReady().then(() => {
  ipcMain.handle('state:load', async () => {
    return readStateFile(getStatePath());
  });

  ipcMain.handle('state:save', async (_event, state: PersistedState) => {
    validatePersistedState(state);
    return writeJsonFile(getStatePath(), state);
  });

  ipcMain.handle('image:select', async (): Promise<SelectedImage | null> => {
    const dialogOptions: OpenDialogOptions = {
      title: '选择参考图片',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || !result.filePaths[0]) return null;

    const filePath = result.filePaths[0];
    const bytes = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase() || 'png';
    const mime = ext === 'jpg' ? 'jpeg' : ext;

    return {
      path: filePath,
      name: path.basename(filePath),
      dataUrl: `data:image/${mime};base64,${bytes.toString('base64')}`,
    };
  });

  ipcMain.handle('directory:select', async (): Promise<string | null> => {
    const dialogOptions: OpenDialogOptions = {
      title: '选择图片保存位置',
      properties: ['openDirectory', 'createDirectory'],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('image:generate', async (_event, params: GenerationParams, config: ApiConfig) => {
    validateGenerateInputs(params, config);
    return generateImage(params, config);
  });

  ipcMain.handle('image:open-folder', async (_event, imagePath?: string) => {
    if (imagePath) shell.showItemInFolder(imagePath);
  });

  ipcMain.handle('image:context-menu', async (_event, imagePath?: string) => {
    const menu = Menu.buildFromTemplate([
      {
        label: imagePath ? '打开文件夹' : '图片尚未保存到本地',
        enabled: Boolean(imagePath),
        click: () => {
          if (imagePath) shell.showItemInFolder(imagePath);
        },
      },
    ]);
    if (mainWindow) {
      menu.popup({ window: mainWindow });
    } else {
      menu.popup();
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
