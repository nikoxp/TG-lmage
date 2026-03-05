import { create } from 'zustand';
import request from '@/utils/request';

export const useTrashStore = create((set, get) => ({
  items: [],
  total: 0,
  isLoading: false,
  error: null,

  // ========== 获取回收站列表 ==========
  fetchTrash: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await request.get('/api/trash');
      set({ items: res.data?.items || [], total: res.data?.total || 0, isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || '获取回收站失败', isLoading: false });
    }
  },

  // ========== 移入回收站 ==========
  moveToTrash: async (fileIds) => {
    try {
      const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
      const res = await request.post('/api/trash', { fileIds: ids });
      return { success: true, message: res.data?.message, movedCount: res.data?.movedCount };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '移入回收站失败' };
    }
  },

  // ========== 恢复 ==========
  restoreItems: async (fileIds) => {
    try {
      const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
      const res = await request.post('/api/trash/restore', { fileIds: ids });
      // 刷新列表
      await get().fetchTrash();
      return { success: true, message: res.data?.message, restoredCount: res.data?.restoredCount };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '恢复失败' };
    }
  },

  // ========== 永久删除 ==========
  permanentDelete: async (fileIds) => {
    try {
      const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
      const res = await request.post('/api/trash/delete', { fileIds: ids });
      await get().fetchTrash();
      return { success: true, message: res.data?.message, deletedCount: res.data?.deletedCount };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '永久删除失败' };
    }
  },

  // ========== 清空回收站 ==========
  emptyTrash: async () => {
    try {
      const res = await request.delete('/api/trash');
      set({ items: [], total: 0 });
      return { success: true, message: res.data?.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '清空失败' };
    }
  },
}));
