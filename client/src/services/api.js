/**
 * API 服务层 - 集中管理所有后端请求
 */
import request from '@/utils/request';

// ========== 认证 ==========
export const authAPI = {
  login: (data) => request.post('/api/auth/login', data),
  register: (data) => request.post('/api/auth/register', data),
  refreshToken: () => request.post('/api/auth/refresh'),
  getCurrentUser: () => request.get('/api/auth/user'),
  getProfile: () => request.get('/api/auth/profile'),
  updateProfile: (data) => request.put('/api/auth/profile', data),
  updateAvatar: (data) => request.put('/api/auth/avatar', data),
  changePassword: (data) => request.put('/api/auth/password', data),
};

// ========== 图片 ==========
export const imageAPI = {
  getList: (params) => request.get('/api/images', { params }),
  getDetail: (id) => request.get(`/api/images/${id}`),
  search: (params) => request.get('/api/images/search', { params }),
  update: (id, data) => request.put(`/api/images/${id}`, data),
  delete: (id) => request.delete(`/api/images/${id}`),
  batchDelete: (fileIds) => request.post('/api/images/batch-delete', { fileIds }),
  batchTag: (fileIds, tags, action = 'add') => request.post('/api/images/batch-tag', { fileIds, tags, action }),
};

// ========== 收藏 ==========
export const favoriteAPI = {
  getList: () => request.get('/api/favorites'),
  add: (id) => request.post(`/api/favorites/${id}`),
  remove: (id) => request.delete(`/api/favorites/${id}`),
  checkStatus: (id) => request.get(`/api/favorites/${id}/status`),
  batchOperation: (data) => request.post('/api/favorites/batch', data),
};

// ========== 标签 ==========
export const tagAPI = {
  getList: () => request.get('/api/tags'),
  create: (data) => request.post('/api/tags', data),
  update: (id, data) => request.put(`/api/tags/${id}`, data),
  delete: (id) => request.delete(`/api/tags/${id}`),
  batchOperation: (data) => request.post('/api/tags/batch', data),
  getImages: (id) => request.get(`/api/tags/${id}/images`),
};

// ========== 统计 ==========
export const statsAPI = {
  getOverview: () => request.get('/api/stats'),
  getStorage: () => request.get('/api/stats/storage'),
};

// ========== 相册 ==========
export const albumAPI = {
  getList: () => request.get('/api/albums'),
  getDetail: (id, params) => request.get(`/api/albums/${id}`, { params }),
  create: (data) => request.post('/api/albums', data),
  update: (id, data) => request.put(`/api/albums/${id}`, data),
  delete: (id) => request.delete(`/api/albums/${id}`),
  modifyImages: (id, imageIds, action = 'add') => request.post(`/api/albums/${id}/images`, { imageIds, action }),
};

// ========== 回收站 ==========
export const trashAPI = {
  getList: () => request.get('/api/trash'),
  moveToTrash: (fileIds) => request.post('/api/trash', { fileIds }),
  restore: (fileIds) => request.post('/api/trash/restore', { fileIds }),
  permanentDelete: (fileIds) => request.post('/api/trash/delete', { fileIds }),
  empty: () => request.delete('/api/trash'),
};

// ========== 分享 ==========
export const shareAPI = {
  getList: () => request.get('/api/shares'),
  create: (data) => request.post('/api/shares', data),
  delete: (id) => request.delete(`/api/shares/${id}`),
  getContent: (id, params) => request.get(`/api/s/${id}`, { params }),
};

// ========== 系统 ==========
export const systemAPI = {
  healthCheck: () => request.get('/api/health'),
};
