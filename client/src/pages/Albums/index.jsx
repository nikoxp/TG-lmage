import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import toast from 'react-hot-toast';
import {
  FolderPlus,
  Folder,
  PencilSimple,
  Trash,
  X,
  Check,
  Images,
  DotsThree,
} from '@phosphor-icons/react';
import { formatDate } from '@/utils/format';

const AlbumsPage = () => {
  const navigate = useNavigate();
  const { albums, isLoading, fetchAlbums, createAlbum, updateAlbum, deleteAlbum } = useAlbumStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return toast.error('请输入相册名称');
    const result = await createAlbum(newName.trim(), newDesc.trim());
    if (result.success) {
      toast.success('相册创建成功！');
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    } else {
      toast.error(result.error);
    }
  }, [newName, newDesc, createAlbum]);

  const handleRename = useCallback(async (albumId) => {
    if (!editName.trim()) return;
    const result = await updateAlbum(albumId, { name: editName.trim() });
    if (result.success) {
      toast.success('已重命名');
      setEditingId(null);
    } else {
      toast.error(result.error);
    }
  }, [editName, updateAlbum]);

  const handleDelete = useCallback(async (albumId) => {
    if (!window.confirm('确定要删除这个相册吗？（图片不会被删除）')) return;
    const result = await deleteAlbum(albumId);
    if (result.success) {
      toast.success('相册已删除');
    } else {
      toast.error(result.error);
    }
  }, [deleteAlbum]);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-n1">
            <Folder className="inline mr-2" weight="duotone" />
            相册
          </h1>
          <p className="text-gray-400 font-hand mt-1">
            {albums.length} 个相册
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2 rotate-slight-1"
        >
          <FolderPlus size={20} /> 新建相册
        </button>
      </div>

      {/* Create Album Form */}
      {showCreate && (
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 border border-dashed border-marker-blue dark:border-blue-800 shadow-sketch rounded-sm -rotate-slight-1">
          <h3 className="font-hand text-xl font-bold text-pencil dark:text-gray-200 mb-4">新建相册</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="相册名称"
            className="input-hand w-full mb-3"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="描述（可选）"
            className="input-hand w-full resize-none h-16 mb-3"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }} className="btn-doodle text-sm">
              取消
            </button>
            <button onClick={handleCreate} className="btn-primary text-sm">
              创建
            </button>
          </div>
        </div>
      )}

      {/* Albums Grid */}
      {isLoading ? (
        <div className="text-center py-20 font-hand text-xl text-pencil dark:text-gray-200 animate-bounce">
          正在翻阅相册...
        </div>
      ) : albums.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
          <Folder size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-2xl font-hand text-gray-500 dark:text-gray-400">还没有相册</h3>
          <p className="font-hand text-gray-400 dark:text-gray-500 mt-2">创建一个相册来整理你的涂鸦吧</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-6">
            <FolderPlus className="inline mr-2" /> 创建第一个相册
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <div
              key={album.id}
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm shadow-sketch hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
              style={{ transform: `rotate(${(Math.random() - 0.5) * 2}deg)` }}
              onClick={() => navigate(`/albums/${album.id}`)}
            >
              {/* Cover */}
              <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
                {album.coverImageId ? (
                  <img
                    src={`/file/${album.coverImageId}?raw=true`}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Folder size={48} className="text-gray-300 dark:text-gray-600" weight="thin" />
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                {editingId === album.id ? (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-hand flex-1 text-sm py-1"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(album.id)}
                    />
                    <button onClick={() => handleRename(album.id)} className="text-green-500"><Check size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400"><X size={18} /></button>
                  </div>
                ) : (
                  <h3 className="font-hand text-lg font-bold text-pencil dark:text-gray-200 truncate">
                    {album.name}
                  </h3>
                )}
                {album.description && !editingId && (
                  <p className="font-hand text-sm text-gray-400 dark:text-gray-500 truncate mt-1">{album.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-hand text-gray-400 flex items-center gap-1">
                    <Images size={14} /> {album.images?.length || 0} 张
                  </span>
                  <span className="text-xs font-hand text-gray-400">
                    {formatDate(album.updatedAt || album.createdAt)}
                  </span>
                </div>
              </div>

              {/* Menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpen(menuOpen === album.id ? null : album.id)}
                  className="p-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow hover:bg-white dark:hover:bg-gray-700"
                >
                  <DotsThree size={20} className="text-pencil dark:text-gray-300" weight="bold" />
                </button>
                {menuOpen === album.id && (
                  <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-sm py-1 min-w-[120px] z-10">
                    <button
                      onClick={() => { setEditingId(album.id); setEditName(album.name); setMenuOpen(null); }}
                      className="w-full text-left px-3 py-2 font-hand text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-pencil dark:text-gray-200"
                    >
                      <PencilSimple size={16} /> 重命名
                    </button>
                    <button
                      onClick={() => { handleDelete(album.id); setMenuOpen(null); }}
                      className="w-full text-left px-3 py-2 font-hand text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-500"
                    >
                      <Trash size={16} /> 删除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlbumsPage;
