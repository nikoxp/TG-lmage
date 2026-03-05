/**
 * 用户统计数据 API
 */

// ========== 获取用户统计概览 ==========
export async function getUserStats(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    // 并行获取所有数据
    const [userFiles, favorites, tags] = await Promise.all([
      c.env.img_url.get(`user:${userId}:files`, { type: 'json' }),
      c.env.img_url.get(`user:${userId}:favorites`, { type: 'json' }),
      c.env.img_url.get(`user:${userId}:tags`, { type: 'json' }),
    ]);

    const files = userFiles || [];
    const favList = favorites || [];
    const tagList = tags || [];

    // 基础统计
    const totalImages = files.length;
    const totalFavorites = favList.length;
    const totalTags = tagList.length;

    // 存储使用量（字节）
    const totalStorage = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);

    // 文件类型分布
    const typeDistribution = {};
    files.forEach(f => {
      const ext = (f.fileName || '').split('.').pop()?.toLowerCase() || 'unknown';
      typeDistribution[ext] = (typeDistribution[ext] || 0) + 1;
    });

    // 按日上传统计（最近30天）
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const dailyUploads = {};
    files.forEach(f => {
      if (f.uploadTime && f.uploadTime > thirtyDaysAgo) {
        const date = new Date(f.uploadTime).toISOString().split('T')[0];
        dailyUploads[date] = (dailyUploads[date] || 0) + 1;
      }
    });

    // 最近上传的5张图片
    const recentUploads = [...files]
      .sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0))
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        uploadTime: f.uploadTime,
      }));

    // 最大文件 & 平均文件大小
    const largestFile = files.reduce((max, f) => (f.fileSize || 0) > (max?.fileSize || 0) ? f : max, null);
    const avgFileSize = totalImages > 0 ? Math.round(totalStorage / totalImages) : 0;

    return c.json({
      overview: {
        totalImages,
        totalFavorites,
        totalTags,
        totalStorage,
        avgFileSize,
      },
      typeDistribution,
      dailyUploads,
      recentUploads,
      largestFile: largestFile ? {
        id: largestFile.id,
        fileName: largestFile.fileName,
        fileSize: largestFile.fileSize,
      } : null,
    });
  } catch (error) {
    console.error('[GET_USER_STATS]', error);
    return c.json({ error: '获取统计数据失败' }, 500);
  }
}

// ========== 获取存储使用详情 ==========
export async function getStorageUsage(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const userFiles = await c.env.img_url.get(`user:${userId}:files`, { type: 'json' }) || [];

    // 按类型统计存储
    const storageByType = {};
    let totalStorage = 0;

    userFiles.forEach(f => {
      const size = f.fileSize || 0;
      const type = (f.mimeType || 'unknown').split('/')[0];
      storageByType[type] = (storageByType[type] || 0) + size;
      totalStorage += size;
    });

    // 按月统计存储增长（最近12个月）
    const monthlyGrowth = {};
    userFiles.forEach(f => {
      if (f.uploadTime) {
        const month = new Date(f.uploadTime).toISOString().substring(0, 7); // YYYY-MM
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + (f.fileSize || 0);
      }
    });

    return c.json({
      totalStorage,
      totalFiles: userFiles.length,
      storageByType,
      monthlyGrowth,
    });
  } catch (error) {
    console.error('[GET_STORAGE_USAGE]', error);
    return c.json({ error: '获取存储使用详情失败' }, 500);
  }
}
