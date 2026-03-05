import { memo } from 'react';

/**
 * Skeleton 骨架屏组件 - 手账风格
 */

// 基础骨架元素
export const SkeletonBlock = memo(({ className = '', style = {} }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-sketch ${className}`}
    style={style}
  />
));
SkeletonBlock.displayName = 'SkeletonBlock';

// 图片卡片骨架
export const SkeletonCard = memo(() => (
  <div className="bg-white dark:bg-gray-800 p-3 pb-8 shadow-sketch border border-gray-200 dark:border-gray-700 relative rotate-slight-1 even:rotate-slight-n1">
    {/* Tape */}
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-gray-100 dark:bg-gray-600 -rotate-2 shadow-tape z-10" />
    {/* Image placeholder */}
    <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-600 animate-pulse">
      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600" />
    </div>
    {/* Caption */}
    <div className="mt-3 px-1 space-y-2">
      <SkeletonBlock className="h-5 w-3/4" />
      <div className="flex justify-between">
        <SkeletonBlock className="h-3 w-12" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

// 列表行骨架
export const SkeletonRow = memo(() => (
  <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 border-b border-dashed border-gray-200 dark:border-gray-700 animate-pulse">
    <SkeletonBlock className="w-16 h-16 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBlock className="h-5 w-48" />
      <div className="flex gap-4">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-3 w-12" />
      </div>
    </div>
    <div className="flex gap-2">
      <SkeletonBlock className="w-8 h-8 rounded-full" />
      <SkeletonBlock className="w-8 h-8 rounded-full" />
    </div>
  </div>
));
SkeletonRow.displayName = 'SkeletonRow';

// Dashboard 网格骨架
export const SkeletonGrid = memo(({ count = 8 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
));
SkeletonGrid.displayName = 'SkeletonGrid';

// Dashboard 列表骨架
export const SkeletonList = memo(({ count = 6 }) => (
  <div className="space-y-0">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
));
SkeletonList.displayName = 'SkeletonList';

// 页头骨架
export const SkeletonHeader = memo(() => (
  <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-4 animate-pulse">
    <div className="space-y-2">
      <SkeletonBlock className="h-10 w-40" />
      <SkeletonBlock className="h-4 w-28" />
    </div>
    <div className="flex gap-2 mt-4 md:mt-0">
      <SkeletonBlock className="h-9 w-20 rounded-md" />
      <SkeletonBlock className="h-9 w-9 rounded-md" />
      <SkeletonBlock className="h-9 w-20 rounded-md" />
    </div>
  </div>
));
SkeletonHeader.displayName = 'SkeletonHeader';

const Skeleton = {
  Block: SkeletonBlock,
  Card: SkeletonCard,
  Row: SkeletonRow,
  Grid: SkeletonGrid,
  List: SkeletonList,
  Header: SkeletonHeader,
};

export default Skeleton;
