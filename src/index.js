import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import { authenticatedUpload } from './functions/upload';
import { fileHandler } from './functions/file/[id]';
import { register, login, refreshToken, getCurrentUser, updateUserAvatar, getUserProfile, updateUserProfile, changePassword } from './functions/user/auth';
import { getUserImages, getImageDetail, deleteUserImage, batchDeleteImages, batchTagImages, updateImageInfo, searchUserImages } from './functions/user/images';
import { getUserStats, getStorageUsage } from './functions/user/stats';
import { getUserFavorites, addToFavorites, removeFromFavorites, checkFavoriteStatus, batchFavoriteOperation } from './functions/user/favorites';
import { getUserTags, createTag, updateTag, deleteTag, batchTagOperation, getTagImages } from './functions/user/tags';
import { getUserAlbums, getAlbumDetail, createAlbum, updateAlbum, deleteAlbum, modifyAlbumImages } from './functions/user/albums';
import { getTrashItems, moveToTrash, restoreFromTrash, permanentDelete, emptyTrash } from './functions/user/trash';
import { createShareLink, getUserShares, deleteShareLink, getShareContent } from './functions/user/share';
import { authMiddleware } from './functions/utils/auth';
import { errorHandling, telemetryData, corsHeaders, requestSizeLimit, rateLimit } from './functions/utils/middleware';

const app = new Hono();

// 全局中间件
app.use('*', errorHandling);
app.use('*', corsHeaders);
app.use('*', telemetryData);
app.use('/upload', requestSizeLimit(20 * 1024 * 1024));
app.use('/api/*', requestSizeLimit(2 * 1024 * 1024));

// 认证端点限流：每分钟最多 10 次
app.use('/api/auth/login', rateLimit({ windowMs: 60000, max: 10, keyPrefix: 'auth-login' }));
app.use('/api/auth/register', rateLimit({ windowMs: 60000, max: 5, keyPrefix: 'auth-register' }));

// 上传接口限流：每分钟最多 30 次
app.use('/upload', rateLimit({ windowMs: 60000, max: 30, keyPrefix: 'upload' }));

// 上传接口
app.post('/upload', authenticatedUpload);

// 文件访问接口
app.get('/file/:id', fileHandler);

// 健康检查和版本信息
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2.1.0',
    timestamp: Date.now(),
    uptime: Math.floor(Date.now() / 1000),
    message: 'TG-Image React 版本运行正常'
  });
});

// 用户认证相关API
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/refresh', authMiddleware, refreshToken);
app.get('/api/auth/user', authMiddleware, getCurrentUser);
app.get('/api/auth/profile', authMiddleware, getUserProfile);
app.put('/api/auth/profile', authMiddleware, updateUserProfile);
app.put('/api/auth/avatar', authMiddleware, updateUserAvatar);
app.put('/api/auth/password', authMiddleware, changePassword);

// 用户统计API
app.get('/api/stats', authMiddleware, getUserStats);
app.get('/api/stats/storage', authMiddleware, getStorageUsage);

// 用户图片管理相关API
app.get('/api/images', authMiddleware, getUserImages);
app.get('/api/images/search', authMiddleware, searchUserImages);
app.post('/api/images/batch-delete', authMiddleware, batchDeleteImages);
app.post('/api/images/batch-tag', authMiddleware, batchTagImages);
app.get('/api/images/:id', authMiddleware, getImageDetail);
app.delete('/api/images/:id', authMiddleware, deleteUserImage);
app.put('/api/images/:id', authMiddleware, updateImageInfo);

// 用户收藏相关API
app.get('/api/favorites', authMiddleware, getUserFavorites);
app.post('/api/favorites/:id', authMiddleware, addToFavorites);
app.delete('/api/favorites/:id', authMiddleware, removeFromFavorites);
app.get('/api/favorites/:id/status', authMiddleware, checkFavoriteStatus);
app.post('/api/favorites/batch', authMiddleware, batchFavoriteOperation);

// 用户标签相关API
app.get('/api/tags', authMiddleware, getUserTags);
app.post('/api/tags', authMiddleware, createTag);
app.put('/api/tags/:id', authMiddleware, updateTag);
app.delete('/api/tags/:id', authMiddleware, deleteTag);
app.post('/api/tags/batch', authMiddleware, batchTagOperation);
app.get('/api/tags/:id/images', authMiddleware, getTagImages);

// 相册管理API
app.get('/api/albums', authMiddleware, getUserAlbums);
app.post('/api/albums', authMiddleware, createAlbum);
app.get('/api/albums/:id', authMiddleware, getAlbumDetail);
app.put('/api/albums/:id', authMiddleware, updateAlbum);
app.delete('/api/albums/:id', authMiddleware, deleteAlbum);
app.post('/api/albums/:id/images', authMiddleware, modifyAlbumImages);

// 回收站API
app.get('/api/trash', authMiddleware, getTrashItems);
app.post('/api/trash', authMiddleware, moveToTrash);
app.post('/api/trash/restore', authMiddleware, restoreFromTrash);
app.post('/api/trash/delete', authMiddleware, permanentDelete);
app.delete('/api/trash', authMiddleware, emptyTrash);

// 分享API
app.get('/api/shares', authMiddleware, getUserShares);
app.post('/api/shares', authMiddleware, createShareLink);
app.delete('/api/shares/:id', authMiddleware, deleteShareLink);
app.get('/api/s/:id', getShareContent); // 公开访问，无需认证

// 静态文件服务
app.use('/assets/*', serveStatic({ root: './' }));
app.use('/images/*', serveStatic({ root: './' }));

// SPA fallback - 所有其他请求返回 index.html
app.get('*', serveStatic({ path: './index.html' }));

export default app;
