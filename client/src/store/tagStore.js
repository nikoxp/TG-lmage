import { create } from 'zustand';
import request from '@/utils/request';

/**
 * 标签状态管理
 * 管理用户的标签系统
 */
const useTagStore = create((set, get) => ({
  // ========== 状态 ==========
  tags: [],
  currentTag: null,
  isLoading: false,
  error: null,

  // ========== 获取标签列表 ==========
  fetchTags: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await request.get('/api/tags');
      const { tags } = response.data;

      set({
        tags,
        isLoading: false,
        error: null,
      });

      return { success: true, tags };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '获取标签列表失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 创建标签 ==========
  createTag: async (tagData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await request.post('/api/tags', tagData);
      const { tag } = response.data;

      set((state) => ({
        tags: [...state.tags, tag],
        isLoading: false,
        error: null,
      }));

      return { success: true, tag };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '创建标签失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 更新标签 ==========
  updateTag: async (tagId, tagData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await request.put(`/api/tags/${tagId}`, tagData);
      const { tag } = response.data;

      set((state) => ({
        tags: state.tags.map((t) => (t.id === tagId ? tag : t)),
        isLoading: false,
        error: null,
      }));

      return { success: true, tag };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '更新标签失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 删除标签 ==========
  deleteTag: async (tagId) => {
    set({ isLoading: true, error: null });

    try {
      await request.delete(`/api/tags/${tagId}`);

      set((state) => ({
        tags: state.tags.filter((t) => t.id !== tagId),
        isLoading: false,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '删除标签失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 批量操作标签 ==========
  batchTagOperation: async (action, imageIds, tagIds) => {
    set({ isLoading: true, error: null });

    try {
      await request.post('/api/tags/batch', {
        action,
        imageIds,
        tagIds,
      });

      set({ isLoading: false, error: null });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '批量操作失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 获取标签下的图片 ==========
  getTagImages: async (tagId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await request.get(`/api/tags/${tagId}/images`);
      const { images } = response.data;

      set({ isLoading: false, error: null });

      return { success: true, images };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '获取标签图片失败';
      set({
        error: errorMessage,
        isLoading: false,
      });

      return { success: false, error: errorMessage };
    }
  },

  // ========== 设置当前标签 ==========
  setCurrentTag: (tag) => {
    set({ currentTag: tag });
  },

  // ========== 根据名称查找标签 ==========
  findTagByName: (name) => {
    return get().tags.find((tag) => tag.name === name);
  },

  // ========== 获取标签数量 ==========
  getTagCount: () => {
    return get().tags.length;
  },

  // ========== 清除错误 ==========
  clearError: () => {
    set({ error: null });
  },

  // ========== 重置状态 ==========
  reset: () => {
    set({
      tags: [],
      currentTag: null,
      error: null,
    });
  },
}));

export { useTagStore };
