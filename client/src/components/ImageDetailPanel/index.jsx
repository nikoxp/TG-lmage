import { useState, useEffect, memo } from 'react';
import { X, Copy, Heart, Trash, Tag, PencilSimple, Check, DownloadSimple, Link as LinkIcon } from '@phosphor-icons/react';
import { formatFileSize, formatDate } from '@/utils/format';
import toast from 'react-hot-toast';

/**
 * ImageDetailPanel - 图片详情侧边面板
 */
const ImageDetailPanel = memo(({
  image,
  isOpen,
  onClose,
  isFavorite,
  onFavorite,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (image) {
      setEditName(image.fileName || '');
      setIsEditing(false);
    }
  }, [image]);

  // 键盘关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const fullUrl = window.location.origin + (image.src || `/file/${image.id}?raw=true`);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制！');
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return toast.error('文件名不能为空');
    if (onUpdate) {
      const result = await onUpdate(image.id, { fileName: editName.trim() });
      if (result?.success) {
        toast.success('已更新');
        setIsEditing(false);
      }
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.fileName || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('下载成功');
    } catch {
      toast.error('下载失败');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dashed border-gray-200 dark:border-gray-700">
          <h3 className="font-hand font-bold text-xl text-pencil dark:text-gray-200 truncate pr-4">
            详情
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="p-4">
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm overflow-hidden">
              <img
                src={fullUrl}
                alt={image.fileName}
                className="w-full max-h-64 object-contain"
              />
            </div>
          </div>

          {/* File Name */}
          <div className="px-4 pb-4">
            <label className="text-xs font-hand text-gray-400 uppercase tracking-wider mb-1 block">文件名</label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-hand flex-1 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditing(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-hand text-lg text-pencil dark:text-gray-200 truncate flex-1">{image.fileName}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-gray-400 hover:text-pencil dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <PencilSimple size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-sm">
              <div className="text-xs font-hand text-gray-400 mb-0.5">大小</div>
              <div className="font-hand text-pencil dark:text-gray-200">{formatFileSize(image.fileSize)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-sm">
              <div className="text-xs font-hand text-gray-400 mb-0.5">类型</div>
              <div className="font-hand text-pencil dark:text-gray-200">{image.mimeType || '未知'}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-sm">
              <div className="text-xs font-hand text-gray-400 mb-0.5">上传时间</div>
              <div className="font-hand text-pencil dark:text-gray-200 text-sm">{formatDate(image.uploadTime)}</div>
            </div>
            {(image.width && image.height) && (
              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-sm">
                <div className="text-xs font-hand text-gray-400 mb-0.5">尺寸</div>
                <div className="font-hand text-pencil dark:text-gray-200">{image.width}×{image.height}</div>
              </div>
            )}
          </div>

          {/* Tags */}
          {image.tags?.length > 0 && (
            <div className="px-4 pb-4">
              <label className="text-xs font-hand text-gray-400 uppercase tracking-wider mb-2 block">标签</label>
              <div className="flex flex-wrap gap-2">
                {image.tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-marker-blue text-sm font-hand rounded">
                    <Tag size={12} /> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* URL */}
          <div className="px-4 pb-4">
            <label className="text-xs font-hand text-gray-400 uppercase tracking-wider mb-1 block">链接</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-sm">
              <input
                type="text"
                value={fullUrl.replace('?raw=true', '')}
                readOnly
                className="flex-1 bg-transparent text-sm font-mono text-gray-600 dark:text-gray-300 outline-none truncate"
              />
              <button
                onClick={() => handleCopy(fullUrl.replace('?raw=true', ''))}
                className="p-1.5 text-gray-400 hover:text-pencil dark:hover:text-gray-200 flex-shrink-0"
                title="复制链接"
              >
                <Copy size={16} />
              </button>
            </div>
            {/* Markdown */}
            <button
              onClick={() => handleCopy(`![${image.fileName}](${fullUrl.replace('?raw=true', '')})`)}
              className="mt-2 text-xs font-hand text-gray-400 hover:text-pencil dark:hover:text-gray-300 flex items-center gap-1"
            >
              <LinkIcon size={12} /> 复制 Markdown
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-dashed border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={handleDownload}
            className="btn-doodle flex-1 flex items-center justify-center gap-2 text-sm"
          >
            <DownloadSimple size={18} /> 下载
          </button>
          <button
            onClick={() => onFavorite?.(image.id)}
            className={`btn-doodle flex items-center justify-center gap-2 text-sm px-4 ${isFavorite ? 'text-red-500 border-red-200 bg-red-50 dark:bg-red-900/20' : ''}`}
          >
            <Heart size={18} weight={isFavorite ? 'fill' : 'regular'} />
          </button>
          <button
            onClick={() => onDelete?.(image)}
            className="btn-doodle flex items-center justify-center gap-2 text-sm px-4 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>
    </>
  );
});

ImageDetailPanel.displayName = 'ImageDetailPanel';

export default ImageDetailPanel;
