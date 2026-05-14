import type { AspectRatio, QualityPreset, ResolutionPreset, ThemeId } from '../types/app';

export const aspectRatios: AspectRatio[] = ['1:1', '4:3', '3:4', '16:9', '9:16'];
export const resolutions: ResolutionPreset[] = ['1K', '2K', '4K'];
export const qualities: QualityPreset[] = ['low', 'medium', 'high'];

export const themeLabels: Record<ThemeId, string> = {
  'cream-pink': '奶油粉',
  'obsidian-gold': '黑金',
  'cloud-blue': '云白蓝',
  'aurora-cyan': '极光紫青',
  'graphite-pink': '石墨粉',
};

export const themeIds = Object.keys(themeLabels) as ThemeId[];

export function summarizePrompt(prompt: string): string {
  const normalized = prompt.trim().replace(/\s+/g, ' ');
  if (!normalized) return '未填写提示词';
  return normalized.length > 34 ? `${normalized.slice(0, 34)}...` : normalized;
}

export function maskSecret(secret: string): string {
  if (!secret) return '未配置';
  if (secret.length <= 8) return '********';
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
