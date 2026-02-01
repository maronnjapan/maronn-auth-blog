import type { TargetCategory } from '@maronn-auth-blog/shared';

export type TargetCategoryMeta = {
  key: TargetCategory;
  label: string;
  icon: string;
};

const TARGET_CATEGORY_META: Record<TargetCategory, TargetCategoryMeta> = {
  authentication: {
    key: 'authentication',
    label: '認証',
    icon: '🔐',
  },
  authorization: {
    key: 'authorization',
    label: '認可',
    icon: '🛂',
  },
  security: {
    key: 'security',
    label: 'セキュリティ',
    icon: '🛡️',
  },
};

export function getTargetCategoryMeta(category: TargetCategory): TargetCategoryMeta {
  return TARGET_CATEGORY_META[category];
}
