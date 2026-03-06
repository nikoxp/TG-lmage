import { create } from 'zustand';
import request from '@/utils/request';

/**
 * 统计数据状态管理
 */
const useStatsStore = create((set, get) => ({
  // ========== 状态 ==========
  overview: null,
  storage: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  // ========== 获取统计概览 ==========
  fetchStats: async (force = false) => {
    // 缓存5分钟
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < 5 * 60 * 1000) {
      return { success: true };
    }

    set({ isLoading: true, error: null });

    try {
      const response = await request.get('/api/stats');

      set({
        overview: response.data,
        isLoading: false,
        lastFetched: Date.now(),
      });

      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.error || '获取统计失败';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  // ========== 获取存储详情 ==========
  fetchStorage: async () => {
    try {
      const response = await request.get('/api/stats/storage');
      set({ storage: response.data });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  },

  // ========== 清除缓存 ==========
  invalidate: () => {
    set({ lastFetched: null });
  },
}));

export { useStatsStore };
