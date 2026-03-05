import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Trash,
  PencilSimple,
  Check,
  X,
  Images,
  ShareNetwork,
  Image as ImageIcon,
} from '@phosphor-icons/react';
import ImageCard from '@/components/ImageCard';
import { ImageViewer, Pagination, Skeleton } from '@/components';
import { formatDate } from '@/utils/format';

const AlbumDetailPage = () => {
  const { id: albumId } = useParams();
  const navigate = useNavigate();
  const {
    currentAlbum,
    albumImages,
    albumPagination,
    isLoading,
    fetchAlbumDetail,
    updateAlbum,
    modifyAlbumImages,
  } = useAlbumStore();
  const { favorites, toggleFavorite } = useFavoriteStore();

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (albumId) fetchAlbumDetail(albumId);
  }, [albumId, fetchAlbumDetail]);

  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) return;
    const result = await updateAlbum(albumId, { name: editName.trim() });
    if (result.success) {
      toast.success('已更新');
      setEditingName(false);
    } else {
      toast.error(result.error);
    }
  }, [albumId, editName, updateAlbum]);

  const handleRemoveImage = useCallback(async (imageId) => {
    const result = await modifyAlbumImages(albumId, [imageId], 'remove');
    if (result.success) {
      toast.success('已从相册移除');
    } else {
      toast.error(result.error);
    }
  }, [albumId, modifyAlbumImages]);

  const handleImageClick = useCallback((img) => {
    const idx = albumImages.findIndex(i => i.id === img.id);
    setViewerIndex(idx >= 0 ? idx : 0);
    setViewerOpen(true);
  }, [albumImages]);

  const handlePageChange = useCallback((page) => {
    fetchAlbumDetail(albumId, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [albumId, fetchAlbumDetail]);

  const checkIsFavorite = useCallback((imageId) => favorites.has(imageId), [favorites]);

  if (isLoading && !currentAlbum) {
    return (
      <div className="text-center py-20 font-hand text-xl text-pencil dark:text-gray-200 animate-bounce">
        正在打开相册...
      </div>
    );
  }

  if (!currentAlbum) {
    return (
      <div className="text-center py-20">
        <h2 className="font-hand text-2xl text-gray-500">相册不存在</h2>
        <button onClick={() => navigate('/albums')} className="btn-doodle mt-4">返回相册列表</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/albums')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full mt-1"
          >
            <ArrowLeft size={24} className="text-pencil dark:text-gray-300" />
          </button>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-hand text-3xl font-bold py-0"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="text-green-500"><Check size={24} /></button>
                <button onClick={() => setEditingName(false)} className="text-gray-400"><X size={24} /></button>
              </div>
            ) : (
              <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-n1 flex items-center gap-2">
                {currentAlbum.name}
                <button
                  onClick={() => { setEditName(currentAlbum.name); setEditingName(true); }}
                  className="p-1 text-gray-400 hover:text-pencil dark:hover:text-gray-200"
                >
                  <PencilSimple size={20} />
                </button>
              </h1>
            )}
            <p className="text-gray-400 font-hand mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Images size={16} /> {currentAlbum.imageCount || 0} 张图片</span>
              <span>创建于 {formatDate(currentAlbum.createdAt)}</span>
            </p>
            {currentAlbum.description && (
              <p className="font-hand text-gray-500 dark:text-gray-400 mt-1 italic">
                &quot;{currentAlbum.description}&quot;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Skeleton.Grid count={8} />
      ) : albumImages.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
          <ImageIcon size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-2xl font-hand text-gray-500">相册是空的</h3>
          <p className="font-hand text-gray-400 mt-2">在图库中选择图片添加到相册</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-6">
            去图库选择
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {albumImages.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              isFavorite={checkIsFavorite(image.id)}
              onFavorite={toggleFavorite}
              onDelete={() => handleRemoveImage(image.id)}
              onView={handleImageClick}
              deleteLabel="移除"
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && albumImages.length > 0 && albumPagination.totalPages > 1 && (
        <Pagination
          currentPage={albumPagination.page || 1}
          totalPages={albumPagination.totalPages || 1}
          onPageChange={handlePageChange}
        />
      )}

      {/* Image Viewer */}
      <ImageViewer
        isOpen={viewerOpen}
        images={albumImages}
        currentIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
};

export default AlbumDetailPage;
