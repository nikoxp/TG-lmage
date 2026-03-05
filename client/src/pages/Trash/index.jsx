import { useEffect, useState, useCallback } from 'react';
import { useTrashStore } from '@/store/trashStore';
import toast from 'react-hot-toast';
import {
  Trash as TrashIcon,
  ArrowCounterClockwise,
  Warning,
  Clock,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  TrashSimple,
} from '@phosphor-icons/react';
import { formatFileSize, formatDate } from '@/utils/format';

const TrashPage = () => {
  const { items, total, isLoading, fetchTrash, restoreItems, permanentDelete, emptyTrash } = useTrashStore();
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const toggleSelect = useCallback((id) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRestore = useCallback(async (ids) => {
    const fileIds = ids || Array.from(selectedItems);
    if (fileIds.length === 0) return;
    const result = await restoreItems(fileIds);
    if (result.success) {
      toast.success(result.message || '已恢复');
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    } else {
      toast.error(result.error);
    }
  }, [selectedItems, restoreItems]);

  const handlePermanentDelete = useCallback(async (ids) => {
    const fileIds = ids || Array.from(selectedItems);
    if (fileIds.length === 0) return;
    if (!window.confirm(`确定要永久删除 ${fileIds.length} 个文件吗？此操作不可恢复！`)) return;
    const result = await permanentDelete(fileIds);
    if (result.success) {
      toast.success(result.message || '已永久删除');
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    } else {
      toast.error(result.error);
    }
  }, [selectedItems, permanentDelete]);

  const handleEmptyTrash = useCallback(async () => {
    if (!window.confirm('确定要清空回收站吗？所有文件将被永久删除！')) return;
    if (!window.confirm('再次确认：这些文件将无法恢复！')) return;
    const result = await emptyTrash();
    if (result.success) {
      toast.success(result.message || '回收站已清空');
    } else {
      toast.error(result.error);
    }
  }, [emptyTrash]);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b-2 border-dashed border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-n1">
            <TrashIcon className="inline mr-2" weight="duotone" />
            回收站
          </h1>
          <p className="text-gray-400 font-hand mt-1">
            {total} 个文件 · 30天后自动清除
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {isSelectionMode ? (
            <div className="flex gap-2 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-marker-yellow dark:border-yellow-800">
              <span className="font-hand text-sm text-gray-500 dark:text-gray-400 self-center px-1">{selectedItems.size} 已选</span>
              <button
                onClick={() => handleRestore()}
                className="btn-doodle text-sm py-1 px-2 text-green-600"
                disabled={selectedItems.size === 0}
              >
                <ArrowCounterClockwise size={18} />
              </button>
              <button
                onClick={() => handlePermanentDelete()}
                className="btn-doodle text-sm py-1 px-2 text-red-500"
                disabled={selectedItems.size === 0}
              >
                <TrashSimple size={18} />
              </button>
              <button
                onClick={() => { setIsSelectionMode(false); setSelectedItems(new Set()); }}
                className="btn-doodle text-sm py-1 px-2"
              >
                <XCircle size={18} />
              </button>
            </div>
          ) : (
            <>
              {items.length > 0 && (
                <>
                  <button
                    onClick={() => setIsSelectionMode(true)}
                    className="btn-doodle flex items-center gap-1 text-sm"
                  >
                    <CheckCircle size={18} /> 选择
                  </button>
                  <button
                    onClick={handleEmptyTrash}
                    className="btn-doodle flex items-center gap-1 text-sm text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Warning size={18} /> 清空
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20 font-hand text-xl text-pencil dark:text-gray-200 animate-bounce">
          正在翻找回收站...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
          <TrashIcon size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-2xl font-hand text-gray-500 dark:text-gray-400">回收站是空的</h3>
          <p className="font-hand text-gray-400 dark:text-gray-500 mt-2">删除的文件会在这里保留30天</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border rounded-sm transition-all cursor-pointer ${
                selectedItems.has(item.id)
                  ? 'border-marker-blue bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => isSelectionMode && toggleSelect(item.id)}
            >
              {/* Selection checkbox */}
              {isSelectionMode && (
                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedItems.has(item.id)
                      ? 'bg-marker-blue border-marker-blue text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedItems.has(item.id) && <CheckCircle size={14} weight="bold" />}
                  </div>
                </div>
              )}

              {/* Thumbnail */}
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-sm overflow-hidden flex-shrink-0">
                <img
                  src={`/file/${item.id}?raw=true`}
                  alt={item.fileName}
                  className="w-full h-full object-cover opacity-60"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-hand text-pencil dark:text-gray-200 truncate">{item.fileName}</p>
                <div className="flex gap-3 text-xs font-hand text-gray-400">
                  <span>{formatFileSize(item.fileSize)}</span>
                  <span>删除于 {formatDate(item.deletedAt)}</span>
                </div>
              </div>

              {/* Days left */}
              <div className="flex-shrink-0 text-center">
                <div className={`text-lg font-hand font-bold ${
                  item.daysLeft <= 7 ? 'text-red-500' : item.daysLeft <= 14 ? 'text-marker-yellow' : 'text-gray-400'
                }`}>
                  {item.daysLeft}
                </div>
                <div className="text-xs font-hand text-gray-400 flex items-center gap-0.5">
                  <Clock size={10} /> 天
                </div>
              </div>

              {/* Actions */}
              {!isSelectionMode && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRestore([item.id]); }}
                    className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    title="恢复"
                  >
                    <ArrowCounterClockwise size={18} className="text-green-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePermanentDelete([item.id]); }}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="永久删除"
                  >
                    <TrashSimple size={18} className="text-red-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrashPage;
