import {
  buildOpenAiCompatibleRequestBody,
  extractOpenAiCompatibleImageResult,
} from './api';
import type { ApiConfig, GenerateImageResult, GenerationParams } from '../types/app';

export async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestOpenAiCompatibleImage(
  params: GenerationParams,
  config: ApiConfig,
  options: {
    requestTimeoutMs: number;
    requestTimeoutMessage: string;
    normalizeSize: (params: GenerationParams) => string;
  },
): Promise<GenerateImageResult> {
  if (!config.endpoint) throw new Error('API 地址未配置。');
  if (!config.model) throw new Error('模型名称未配置。');
  if (!params.prompt.trim()) throw new Error('提示词不能为空。');
  if (params.mode === 'image-to-image' && !params.referenceImageDataUrl) {
    throw new Error('图生图模式需要先选择参考图片。');
  }

  const body = buildOpenAiCompatibleRequestBody(params, config, options.normalizeSize(params));
  const response = await fetchWithTimeout(
    config.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    },
    options.requestTimeoutMs,
    options.requestTimeoutMessage,
  );

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? JSON.stringify((payload as Record<string, unknown>).error)
        : text;
    throw new Error(`API 请求失败 (${response.status})：${message || response.statusText}`);
  }

  const result = extractOpenAiCompatibleImageResult(payload);
  if (!result.imageUrl && !result.imageDataUrl) {
    throw new Error('API 已返回结果，但没有识别到图片 URL 或 base64 图片数据。');
  }

  return result;
}
