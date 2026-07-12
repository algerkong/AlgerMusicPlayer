import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Tabs } from './Tabs.vue';
export { default as TabsContent } from './TabsContent.vue';
export { default as TabsList } from './TabsList.vue';
export { default as TabsTrigger } from './TabsTrigger.vue';

export const tabsListVariants = cva(
  'rounded-lg p-1 group/tabs-list inline-flex h-9 w-fit items-center justify-center text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export type TabsListVariants = VariantProps<typeof tabsListVariants>;
