import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavoriteStore } from '@/store/favoriteStore';
import toast from 'react-hot-toast';
import {
  Star,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import ImageCard from '@/components/ImageCard';
import { ImageViewer, Skeleton } from '@/components';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { favoriteImages, favorites, isLoading, initFavorites, toggleFavorite } = useFavoriteStore();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    initFavorites();
  }, [initFavorites]);

  // 映射图片格式以兼容 ImageCard 和 ImageViewer
  const mappedImages = favoriteImages.map((img) => ({
    ...img,
    src: img.url ? `${img.url}?raw=true` : `/file/${img.id}?raw=true`,
  }));

  const copyImageUrl = useCallback((image) => {
    navigator.clipboard.writeText(window.location.origin + image.src);
    toast.success('已复制！');
  }, []);

  const handleUnfavorite = useCallback((imageId) => {
    toggleFavorite(imageId);
    toast('已取消星标', { icon: '💔' });
  }, [toggleFavorite]);

  const handleImageClick = useCallback((img) => {
    const idx = mappedImages.findIndex(i => i.id === img.id);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  }, [mappedImages]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-1">
            <Star weight="fill" className="inline text-marker-yellow mb-2" /> 星标页面
          </h1>
          <p className="text-gray-400 font-hand mt-1 rotate-slight-n1">
            {mappedImages.length} 个珍藏回忆
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton.Grid count={8} />
      ) : mappedImages.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
          <Star size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-hand text-gray-500">还没有星星！</h3>
          <p className="font-hand text-gray-400 mb-6">去发现一些你喜欢的涂鸦吧。</p>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary rotate-slight-1">
            <ImageIcon className="inline mr-2" />
            前往图库
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {mappedImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              isFavorite={true}
              onFavorite={handleUnfavorite}
              onCopy={copyImageUrl}
              onClick={handleImageClick}
            />
          ))}
        </div>
      )}

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerOpen}
        images={mappedImages}
        currentIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};

export default FavoritesPage;
