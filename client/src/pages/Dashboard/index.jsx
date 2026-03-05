import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useImageStore } from '@/store/imageStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import { useStatsStore } from '@/store/statsStore';
import { useDebounce } from '@/hooks';
import toast from 'react-hot-toast';
import {
  Image as ImageIcon,
  CloudArrowUp,
  SquaresFour,
  List,
  CheckCircle,
  Trash,
  XCircle,
  SortAscending,
  SortDescending,
  Heart,
  Copy,
  Eye,
  Circle,
  MagnifyingGlass,
  HardDrives,
  Star,
  Images,
  X,
  Info,
  Tag,
  Funnel,
} from '@phosphor-icons/react';
import ImageCard from '@/components/ImageCard';
import { ImageViewer, Pagination, Skeleton, ImageDetailPanel } from '@/components';
import { formatFileSize, formatDate } from '@/utils/format';
import { uploadFiles } from '@/services/uploadService';

const DashboardPage = () => {
  const navigate = useNavigate();
  const {
    images,
    isLoading,
    filters,
    pagination,
    selectedImages,
    isSelectionMode,
    fetchImages,
    deleteImage,
    deleteImages,
    setViewMode,
    setSortBy,
    toggleSelectionMode,
    toggleImageSelection,
    toggleSelectAll,
    clearSelection,
    updateImage,
    batchTagImages,
    setTypeFilter,
  } = useImageStore();

  const { favorites, toggleFavorite } = useFavoriteStore();
  const { overview, fetchStats } = useStatsStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailImage, setDetailImage] = useState(null);
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    fetchImages();
    fetchStats();
  }, [fetchImages, fetchStats]);

  // 搜索防抖
  useEffect(() => {
    const { searchImages } = useImageStore.getState();
    searchImages(debouncedSearch);
  }, [debouncedSearch]);

  // 使用 useCallback 缓存回调函数，避免 ImageCard 不必要的重渲染
  const handleDeleteClick = useCallback((image) => {
    setImageToDelete(image);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!imageToDelete) return;
    const result = await deleteImage(imageToDelete.id);
    if (result.success) {
      toast.success('涂鸦已擦除！');
      setShowDeleteModal(false);
      setImageToDelete(null);
    } else {
      toast.error(result.error);
    }
  }, [imageToDelete, deleteImage]);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedImages.size === 0) return;
    if (window.confirm(`确定要擦除这 ${selectedImages.size} 张涂鸦吗？`)) {
      const result = await deleteImages(Array.from(selectedImages));
      if (result.success) {
        toast.success(`已擦除 ${selectedImages.size} 张涂鸦。`);
      } else {
        toast.error(result.error);
      }
    }
  }, [selectedImages, deleteImages]);

  const handleBatchTag = useCallback(async () => {
    if (selectedImages.size === 0 || !batchTagInput.trim()) return;
    const tags = batchTagInput.split(/[,，\s]+/).filter(Boolean);
    const result = await batchTagImages(Array.from(selectedImages), tags, 'add');
    if (result.success) {
      toast.success(result.message || '标签已添加');
      setShowBatchTag(false);
      setBatchTagInput('');
    } else {
      toast.error(result.error);
    }
  }, [selectedImages, batchTagInput, batchTagImages]);

  const copyImageUrl = useCallback((image) => {
    navigator.clipboard.writeText(window.location.origin + image.src);
    toast.success('链接已复制！');
  }, []);

  // 使用 useCallback 包装 isFavorite 检查
  const checkIsFavorite = useCallback((imageId) => favorites.has(imageId), [favorites]);

  const handleImageClick = useCallback((img) => {
    const idx = images.findIndex(i => i.id === img.id);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  }, [images]);

  const handleImageInfo = useCallback((img) => {
    setDetailImage(img);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailImage(null);
  }, []);

  const handleExitSelection = useCallback(() => {
    toggleSelectionMode();
    clearSelection();
  }, [toggleSelectionMode, clearSelection]);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, [setSortBy]);

  const handleSetGridView = useCallback(() => setViewMode('grid'), [setViewMode]);
  const handleSetListView = useCallback(() => setViewMode('list'), [setViewMode]);

  const handlePageChange = useCallback((page) => {
    fetchImages(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchImages]);

  const navigateToHome = useCallback(() => navigate('/'), [navigate]);

  // Paste to upload (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files = [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length === 0) return;
      e.preventDefault();

      toast.loading(`正在上传 ${files.length} 张粘贴的图片...`, { id: 'paste-upload' });
      try {
        const result = await uploadFiles(files);
        toast.dismiss('paste-upload');
        if (result.success && result.summary?.success > 0) {
          toast.success(`已上传 ${result.summary.success} 张图片`);
          fetchImages(pagination.page);
          useStatsStore.getState().invalidate();
        } else {
          toast.error(result.error || '上传失败');
        }
      } catch {
        toast.dismiss('paste-upload');
        toast.error('粘贴上传失败');
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [fetchImages, pagination.page]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && isSelectionMode) {
        handleExitSelection();
      }
      if (e.key === 'Delete' && isSelectionMode && selectedImages.size > 0) {
        handleBatchDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, selectedImages, handleExitSelection, handleBatchDelete]);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-n1">
            我的涂鸦
          </h1>
          <p className="text-gray-400 font-hand mt-1">
            收集了 {images.length} 个美好瞬间
          </p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          {isSelectionMode ? (
             <div className="flex gap-2 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-marker-yellow dark:border-yellow-800 rotate-1">
                <span className="font-hand text-sm text-gray-500 dark:text-gray-400 self-center px-1">{selectedImages.size} 已选</span>
                <button onClick={toggleSelectAll} className="btn-doodle text-sm py-1 px-2">
                   全选
                </button>
                <button onClick={() => setShowBatchTag(!showBatchTag)} className="btn-doodle text-sm py-1 px-2 text-marker-blue" title="批量添加标签">
                   <Tag size={18} />
                </button>
                <button onClick={handleBatchDelete} className="btn-doodle text-sm py-1 px-2 text-red-500 hover:bg-red-50">
                   <Trash size={18} />
                </button>
                <button onClick={handleExitSelection} className="btn-doodle text-sm py-1 px-2">
                   <XCircle size={18} />
                </button>
             </div>
          ) : (
             <>
               <button
                 onClick={toggleSelectionMode}
                 className="btn-doodle flex items-center gap-1 text-sm py-1 px-3"
                 title="批量选择"
               >
                 <CheckCircle size={20} /> 选择
               </button>
               <select
                 value={filters.sortBy}
                 onChange={handleSortChange}
                 className="input-hand text-sm py-1 px-2 min-w-0 w-auto appearance-none cursor-pointer"
                 title="排序方式"
               >
                 <option value="newest">最新上传</option>
                 <option value="oldest">最早上传</option>
                 <option value="name">按名称</option>
                 <option value="largest">最大文件</option>
                 <option value="smallest">最小文件</option>
               </select>
               <select
                 value={filters.type}
                 onChange={(e) => setTypeFilter(e.target.value)}
                 className="input-hand text-sm py-1 px-2 min-w-0 w-auto appearance-none cursor-pointer"
                 title="类型筛选"
               >
                 <option value="">全部类型</option>
                 <option value="image">图片</option>
                 <option value="video">视频</option>
                 <option value="audio">音频</option>
                 <option value="png">PNG</option>
                 <option value="jpg">JPG</option>
                 <option value="gif">GIF</option>
                 <option value="webp">WebP</option>
                 <option value="svg">SVG</option>
               </select>
               <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-md rotate-slight-1">
                 <button
                   onClick={handleSetGridView}
                   className={`p-1 rounded ${filters.viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
                 >
                   <SquaresFour size={20} />
                 </button>
                 <button
                   onClick={handleSetListView}
                   className={`p-1 rounded ${filters.viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}
                 >
                   <List size={20} />
                 </button>
               </div>
             </>
          )}
        </div>
      </div>

      {/* Batch Tag Input */}
      {showBatchTag && isSelectionMode && selectedImages.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-dashed border-marker-blue dark:border-blue-800 rounded-sm -rotate-slight-1">
          <label className="font-hand text-sm text-pencil dark:text-gray-200 mb-2 block">
            为 {selectedImages.size} 张图片添加标签（空格或逗号分隔）
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={batchTagInput}
              onChange={(e) => setBatchTagInput(e.target.value)}
              placeholder="标签1, 标签2, 标签3"
              className="input-hand flex-1 text-sm py-1.5"
              onKeyDown={(e) => e.key === 'Enter' && handleBatchTag()}
              autoFocus
            />
            <button onClick={handleBatchTag} className="btn-doodle text-sm py-1 px-4 text-marker-blue">
              添加
            </button>
            <button onClick={() => setShowBatchTag(false)} className="btn-doodle text-sm py-1 px-2">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 relative">
        <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="搜索涂鸦..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-hand w-full pl-10 pr-10 py-2.5 text-lg"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pencil dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Stats Overview */}
      {overview && !isSelectionMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-3 rounded-sm text-center rotate-slight-1 hover:rotate-0 transition-transform">
            <Images size={24} className="mx-auto text-marker-blue mb-1" />
            <div className="text-2xl font-hand font-bold text-pencil dark:text-gray-200">{overview.overview?.totalImages || 0}</div>
            <div className="text-xs font-hand text-gray-400">总图片</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-3 rounded-sm text-center -rotate-1 hover:rotate-0 transition-transform">
            <HardDrives size={24} className="mx-auto text-marker-yellow mb-1" />
            <div className="text-2xl font-hand font-bold text-pencil dark:text-gray-200">{formatFileSize(overview.overview?.totalStorage || 0)}</div>
            <div className="text-xs font-hand text-gray-400">已用存储</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-3 rounded-sm text-center rotate-slight-1 hover:rotate-0 transition-transform">
            <Star size={24} className="mx-auto text-red-400 mb-1" weight="fill" />
            <div className="text-2xl font-hand font-bold text-pencil dark:text-gray-200">{overview.overview?.totalFavorites || 0}</div>
            <div className="text-xs font-hand text-gray-400">收藏</div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-3 rounded-sm text-center -rotate-slight-1 hover:rotate-0 transition-transform">
            <CloudArrowUp size={24} className="mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-hand font-bold text-pencil dark:text-gray-200">{formatFileSize(overview.overview?.avgFileSize || 0)}</div>
            <div className="text-xs font-hand text-gray-400">平均大小</div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        filters.viewMode === 'grid' ? <Skeleton.Grid count={8} /> : <Skeleton.List count={6} />
      ) : images.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
          <ImageIcon size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-hand text-gray-500">这里空空如也！</h3>
          <button onClick={navigateToHome} className="btn-primary mt-6 rotate-slight-n1">
            <CloudArrowUp className="inline mr-2" />
            开始记录
          </button>
        </div>
      ) : (
        <div className={`
          ${filters.viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'
            : 'space-y-4'
          }
        `}>
          {images.map((image) => (
            filters.viewMode === 'grid' ? (
              <ImageCard
                key={image.id}
                image={image}
                isSelected={selectedImages.has(image.id)}
                isFavorite={checkIsFavorite(image.id)}
                showSelection={isSelectionMode}
                onSelect={toggleImageSelection}
                onFavorite={toggleFavorite}
                onCopy={copyImageUrl}
                onDelete={handleDeleteClick}
                onClick={handleImageClick}
              />
            ) : (
              <div
                key={image.id}
                className={`flex items-center gap-4 bg-white dark:bg-gray-800 p-4 border-b border-dashed border-gray-200 dark:border-gray-700 hover:bg-yellow-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${
                  selectedImages.has(image.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-marker-blue' : ''
                }`}
                onClick={() => handleImageClick(image)}
              >
                {/* Selection */}
                {isSelectionMode && (
                  <button
                    className="flex-shrink-0 text-pencil hover:text-marker-blue"
                    onClick={(e) => { e.stopPropagation(); toggleImageSelection(image.id); }}
                  >
                    {selectedImages.has(image.id)
                      ? <CheckCircle size={24} weight="fill" className="text-marker-blue" />
                      : <Circle size={24} />}
                  </button>
                )}
                {/* Thumbnail */}
                <img
                  src={image.src}
                  alt={image.fileName}
                  loading="lazy"
                  className="w-16 h-16 object-cover border border-gray-200 flex-shrink-0 rounded-sm"
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-hand font-bold text-lg text-pencil dark:text-gray-200 truncate" title={image.fileName}>
                    {image.fileName}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-hand mt-1">
                    <span>{formatFileSize(image.fileSize)}</span>
                    <span>{formatDate(image.uploadTime)}</span>
                    {image.views > 0 && (
                      <span className="flex items-center gap-1"><Eye size={12} /> {image.views}</span>
                    )}
                    {image.tags?.length > 0 && (
                      <span className="text-marker-blue">#{image.tags.join(' #')}</span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleImageInfo(image); }}
                    title="详情"
                  >
                    <Info size={18} className="text-marker-blue" />
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); copyImageUrl(image); }}
                    title="复制链接"
                  >
                    <Copy size={18} className="text-pencil dark:text-gray-300" />
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(image.id); }}
                    title="收藏"
                  >
                    <Heart
                      size={18}
                      weight={checkIsFavorite(image.id) ? 'fill' : 'regular'}
                      className={checkIsFavorite(image.id) ? 'text-red-500' : 'text-pencil dark:text-gray-300'}
                    />
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(image); }}
                    title="删除"
                  >
                    <Trash size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && images.length > 0 && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || 1}
          totalPages={pagination.totalPages || 1}
          onPageChange={handlePageChange}
        />
      )}

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerOpen}
        images={images}
        currentIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />

      {/* Image Detail Panel */}
      <ImageDetailPanel
        image={detailImage}
        isOpen={!!detailImage}
        onClose={handleCloseDetail}
        isFavorite={detailImage ? checkIsFavorite(detailImage.id) : false}
        onFavorite={toggleFavorite}
        onDelete={handleDeleteClick}
        onUpdate={updateImage}
      />

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
          <div className="bg-white dark:bg-gray-800 p-8 max-w-sm w-full shadow-sketch rotate-slight-1 relative" onClick={e => e.stopPropagation()}>
             <div className="tape-top"></div>
             <h3 className="text-2xl font-hand font-bold text-red-500 mb-4 text-center">撕掉这一页？</h3>
             <p className="text-center font-hand text-gray-500 mb-6">撕了可就粘不回去了。</p>
             <div className="flex gap-4 justify-center">
                <button onClick={closeDeleteModal} className="btn-doodle">留着吧</button>
                <button onClick={confirmDelete} className="btn-doodle bg-red-100 hover:bg-red-200 text-red-600 border-red-200">是的，擦掉它</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
