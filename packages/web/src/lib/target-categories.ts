import type { TargetCategory } from '@maronn-auth-blog/shared';

export type TargetCategoryMeta = {
  key: TargetCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
};

const TARGET_CATEGORY_META: Record<TargetCategory, TargetCategoryMeta> = {
  authentication: {
    key: 'authentication',
    label: '認証',
    icon: '🔐',
    color: '#6366f1',
    bgColor: '#eef2ff',
  },
  authorization: {
    key: 'authorization',
    label: '認可',
    icon: '🛂',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
  },
  security: {
    key: 'security',
    label: 'セキュリティ',
    icon: '🛡️',
    color: '#0ea5e9',
    bgColor: '#f0f9ff',
  },
};

export function getTargetCategoryMeta(category: TargetCategory): TargetCategoryMeta {
  return TARGET_CATEGORY_META[category];
}
