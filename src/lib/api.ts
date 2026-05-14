import type {
  ApiCapabilities,
  ApiConfig,
  CapabilityState,
  GenerationMode,
  GenerationParams,
} from '../types/app';

export const supportedApiProtocol = 'openai-compatible-images' as const;

export const apiProtocolLabel = 'OpenAI-compatible 图片接口';

export const capabilityLabels: Record<CapabilityState, string> = {
  supported: '支持',
  unsupported: '不支持',
  unknown: '未知',
};

export interface CapabilityIssue {
  field: keyof ApiCapabilities;
  state: CapabilityState;
  message: string;
}

const capabilityFieldLabels: Record<keyof ApiCapabilities, string> = {
  textToImage: '文生图',
  imageToImage: '图生图',
  aspectRatio: '尺寸比例',
  resolution: '分辨率',
  quality: 'quality',
};

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getModeCapabilityState(capabilities: ApiCapabilities, mode: GenerationMode): CapabilityState {
  return mode === 'image-to-image' ? capabilities.imageToImage : capabilities.textToImage;
}

export function collectCapabilityIssues(
  params: Pick<GenerationParams, 'mode' | 'aspectRatio' | 'resolution' | 'quality'>,
  capabilities: ApiCapabilities,
): CapabilityIssue[] {
  const issues: CapabilityIssue[] = [];
  const modeField = params.mode === 'image-to-image' ? 'imageToImage' : 'textToImage';
  const modeState = capabilities[modeField];

  if (modeState !== 'supported') {
    issues.push({
      field: modeField,
      state: modeState,
      message:
        modeState === 'unsupported'
          ? `当前 API 不支持${capabilityFieldLabels[modeField]}。`
          : `当前 API 的${capabilityFieldLabels[modeField]}能力尚未确认，可以尝试生成。`,
    });
  }

  (['aspectRatio', 'resolution', 'quality'] as const).forEach((field) => {
    const state = capabilities[field];
    if (state !== 'supported') {
      issues.push({
        field,
        state,
        message:
          state === 'unsupported'
            ? `当前 API 不支持${capabilityFieldLabels[field]}参数。`
            : `当前 API 的${capabilityFieldLabels[field]}参数支持状态未确认，可以尝试生成。`,
      });
    }
  });

  return issues;
}

export function formatUnsupportedCapabilityMessage(issues: CapabilityIssue[]): string {
  const unsupported = issues.filter((issue) => issue.state === 'unsupported');
  if (unsupported.length === 0) return '';
  return unsupported.map((issue) => issue.message).join(' ');
}

export function buildOpenAiCompatibleRequestBody(
  params: Pick<GenerationParams, 'mode' | 'prompt' | 'referenceImageDataUrl' | 'aspectRatio' | 'resolution' | 'quality'>,
  config: Pick<ApiConfig, 'model'>,
  size: string,
) {
  return {
    model: config.model,
    prompt: params.prompt,
    size,
    quality: params.quality,
    image: params.mode === 'image-to-image' ? params.referenceImageDataUrl : undefined,
    response_format: 'url',
  };
}

export function extractOpenAiCompatibleImageResult(payload: unknown) {
  if (!payload || typeof payload !== 'object') return { raw: payload };

  const data = payload as Record<string, unknown>;
  const dataArray = Array.isArray(data.data) ? data.data : undefined;
  const first = dataArray?.[0] as Record<string, unknown> | undefined;

  const directUrl = typeof data.url === 'string' ? data.url : undefined;
  const directImage = typeof data.image === 'string' ? data.image : undefined;
  const directBase64 = typeof data.b64_json === 'string' ? data.b64_json : undefined;
  const nestedUrl = typeof first?.url === 'string' ? first.url : undefined;
  const nestedBase64 = typeof first?.b64_json === 'string' ? first.b64_json : undefined;

  const imageUrl = directUrl ?? nestedUrl;
  const base64 = directBase64 ?? nestedBase64;
  const imageDataUrl = directImage?.startsWith('data:image/')
    ? directImage
    : base64
      ? `data:image/png;base64,${base64}`
      : undefined;

  return {
    imageUrl,
    imageDataUrl,
    raw: payload,
  };
}
