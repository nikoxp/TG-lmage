import { create } from 'zustand';
import request from '@/utils/request';

export const useAlbumStore = create((set, get) => ({
  albums: [],
  currentAlbum: null,
  albumImages: [],
  albumPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  isLoading: false,
  error: null,

  // ========== 获取所有相册 ==========
  fetchAlbums: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await request.get('/api/albums');
      set({ albums: res.data?.albums || [], isLoading: false });
    } catch (error) {
      set({ error: error.response?.data?.error || '获取相册失败', isLoading: false });
    }
  },

  // ========== 获取相册详情 ==========
  fetchAlbumDetail: async (albumId, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await request.get(`/api/albums/${albumId}`, { params: { page, limit: 20 } });
      const { album, images, pagination } = res.data;

      // 映射图片 src
      const mappedImages = images.map(f => ({
        ...f,
        src: f.url ? `${f.url}?raw=true` : `/file/${f.id}?raw=true`,
      }));

      set({
        currentAlbum: album,
        albumImages: mappedImages,
        albumPagination: pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.response?.data?.error || '获取相册详情失败', isLoading: false });
    }
  },

  // ========== 创建相册 ==========
  createAlbum: async (name, description = '') => {
    try {
      const res = await request.post('/api/albums', { name, description });
      if (res.data?.album) {
        set((state) => ({ albums: [...state.albums, res.data.album] }));
      }
      return { success: true, album: res.data?.album };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '创建相册失败' };
    }
  },

  // ========== 更新相册 ==========
  updateAlbum: async (albumId, data) => {
    try {
      const res = await request.put(`/api/albums/${albumId}`, data);
      set((state) => ({
        albums: state.albums.map(a => a.id === albumId ? { ...a, ...res.data?.album } : a),
        currentAlbum: state.currentAlbum?.id === albumId ? { ...state.currentAlbum, ...res.data?.album } : state.currentAlbum,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '更新相册失败' };
    }
  },

  // ========== 删除相册 ==========
  deleteAlbum: async (albumId) => {
    try {
      await request.delete(`/api/albums/${albumId}`);
      set((state) => ({
        albums: state.albums.filter(a => a.id !== albumId),
        currentAlbum: state.currentAlbum?.id === albumId ? null : state.currentAlbum,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '删除相册失败' };
    }
  },

  // ========== 添加/移除图片 ==========
  modifyAlbumImages: async (albumId, imageIds, action = 'add') => {
    try {
      const res = await request.post(`/api/albums/${albumId}/images`, { imageIds, action });
      // 刷新相册列表和当前详情
      await get().fetchAlbums();
      if (get().currentAlbum?.id === albumId) {
        await get().fetchAlbumDetail(albumId, get().albumPagination.page);
      }
      return { success: true, message: res.data?.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || '操作失败' };
    }
  },
}));
