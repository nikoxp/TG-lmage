/**
 * 用户收藏功能相关API
 */
import { validateFileId, validatePagination } from '../utils/sanitize';

// ========== 获取用户收藏列表 ==========
export async function getUserFavorites(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const url = new URL(c.req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );
    const offset = (page - 1) * limit;

    // 获取用户收藏列表
    const userFavoritesKey = `user:${userId}:favorites`;
    let favoriteIds = await c.env.img_url.get(userFavoritesKey, { type: 'json' }) || [];

    // 并行获取所有收藏图片的详细信息
    const metadataPromises = favoriteIds.map(id =>
      c.env.img_url.getWithMetadata(id).then(data => ({ id, data })).catch(() => ({ id, data: null }))
    );
    const metadataResults = await Promise.all(metadataPromises);

    const favoriteImages = [];
    const validIds = [];

    for (const { id, data } of metadataResults) {
      if (data?.metadata && (data.metadata.userId === userId || data.metadata.userId === 'anonymous')) {
        validIds.push(id);
        favoriteImages.push({
          id,
          fileName: data.metadata.fileName || id,
          fileSize: data.metadata.fileSize || 0,
          uploadTime: data.metadata.TimeStamp || Date.now(),
          favoriteTime: data.metadata.favoriteTime || Date.now(),
          tags: data.metadata.tags || [],
          url: `/file/${id}`,
          thumbnailUrl: `/file/${id}`,
          views: data.metadata.views || 0,
        });
      }
    }

    // 自动清理不存在的收藏
    if (validIds.length !== favoriteIds.length) {
      await c.env.img_url.put(userFavoritesKey, JSON.stringify(validIds));
    }

    // 按收藏时间排序
    favoriteImages.sort((a, b) => (b.favoriteTime || 0) - (a.favoriteTime || 0));

    // 分页
    const totalItems = favoriteImages.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedImages = favoriteImages.slice(offset, offset + limit);

    return c.json({
      images: paginatedImages,
      pagination: { page, limit, total: totalItems, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (error) {
    console.error('[GET_FAVORITES]', error);
    return c.json({ error: '获取收藏列表失败' }, 500);
  }
}

// ========== 内部：添加单个收藏 ==========
async function _addFavorite(env, userId, fileId) {
  const fileData = await env.img_url.getWithMetadata(fileId);
  if (!fileData?.metadata) {
    return { success: false, message: '文件不存在' };
  }

  if (fileData.metadata.userId !== userId && fileData.metadata.userId !== 'anonymous') {
    return { success: false, message: '无权收藏此文件' };
  }

  const userFavoritesKey = `user:${userId}:favorites`;
  let favoriteIds = await env.img_url.get(userFavoritesKey, { type: 'json' }) || [];

  if (favoriteIds.includes(fileId)) {
    return { success: true, message: '已在收藏中' };
  }

  favoriteIds.push(fileId);
  const updatedMetadata = {
    ...fileData.metadata,
    liked: true,
    favoriteTime: Date.now(),
    favoriteUserId: userId,
  };

  await Promise.all([
    env.img_url.put(userFavoritesKey, JSON.stringify(favoriteIds)),
    env.img_url.put(fileId, '', { metadata: updatedMetadata }),
  ]);

  return { success: true, message: '添加成功', favoriteTime: updatedMetadata.favoriteTime };
}

// ========== 内部：移除单个收藏 ==========
async function _removeFavorite(env, userId, fileId) {
  const userFavoritesKey = `user:${userId}:favorites`;
  let favoriteIds = await env.img_url.get(userFavoritesKey, { type: 'json' }) || [];

  if (!favoriteIds.includes(fileId)) {
    return { success: false, message: '图片不在收藏列表中' };
  }

  favoriteIds = favoriteIds.filter(id => id !== fileId);

  const promises = [env.img_url.put(userFavoritesKey, JSON.stringify(favoriteIds))];

  const fileData = await env.img_url.getWithMetadata(fileId);
  if (fileData?.metadata) {
    const updatedMetadata = {
      ...fileData.metadata,
      liked: false,
      favoriteTime: null,
      favoriteUserId: null,
    };
    promises.push(env.img_url.put(fileId, '', { metadata: updatedMetadata }));
  }

  await Promise.all(promises);
  return { success: true, message: '取消收藏成功' };
}

// ========== 添加图片到收藏 ==========
export async function addToFavorites(c) {
  try {
    const user = c.get('user');
    const rawId = c.req.param('id');

    const idResult = validateFileId(rawId);
    if (!idResult.valid) return c.json({ error: idResult.message }, 400);

    const result = await _addFavorite(c.env, user.id, idResult.value);
    if (!result.success) {
      return c.json({ error: result.message }, 400);
    }

    return c.json({
      message: result.message,
      fileId: idResult.value,
      favoriteTime: result.favoriteTime,
    });
  } catch (error) {
    console.error('[ADD_FAVORITE]', error);
    return c.json({ error: '添加收藏失败' }, 500);
  }
}

// ========== 从收藏中移除图片 ==========
export async function removeFromFavorites(c) {
  try {
    const user = c.get('user');
    const rawId = c.req.param('id');

    const idResult = validateFileId(rawId);
    if (!idResult.valid) return c.json({ error: idResult.message }, 400);

    const result = await _removeFavorite(c.env, user.id, idResult.value);
    if (!result.success) {
      return c.json({ error: result.message }, 404);
    }

    return c.json({ message: result.message, fileId: idResult.value });
  } catch (error) {
    console.error('[REMOVE_FAVORITE]', error);
    return c.json({ error: '取消收藏失败' }, 500);
  }
}

// ========== 检查图片是否已收藏 ==========
export async function checkFavoriteStatus(c) {
  try {
    const user = c.get('user');
    const rawId = c.req.param('id');

    const idResult = validateFileId(rawId);
    if (!idResult.valid) return c.json({ error: idResult.message }, 400);

    const userFavoritesKey = `user:${user.id}:favorites`;
    const favoriteIds = await c.env.img_url.get(userFavoritesKey, { type: 'json' }) || [];

    return c.json({
      fileId: idResult.value,
      isFavorited: favoriteIds.includes(idResult.value),
    });
  } catch (error) {
    console.error('[CHECK_FAVORITE]', error);
    return c.json({ error: '检查收藏状态失败' }, 500);
  }
}

// ========== 批量操作收藏（不再使用 mock request hack） ==========
export async function batchFavoriteOperation(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { fileIds, operation } = await c.req.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: '文件ID列表不能为空' }, 400);
    }

    if (fileIds.length > 50) {
      return c.json({ error: '单次最多操作50个文件' }, 400);
    }

    if (!['add', 'remove'].includes(operation)) {
      return c.json({ error: '操作类型无效，只支持 add 和 remove' }, 400);
    }

    // 验证所有 ID
    const validIds = [];
    for (const id of fileIds) {
      const result = validateFileId(id);
      if (result.valid) validIds.push(result.value);
    }

    const results = [];
    const handler = operation === 'add' ? _addFavorite : _removeFavorite;

    // 逐个执行（KV 有一致性要求，不能完全并行操作同一个 key）
    for (const fileId of validIds) {
      try {
        const result = await handler(c.env, userId, fileId);
        results.push({ fileId, ...result });
      } catch (error) {
        results.push({ fileId, success: false, message: error.message || '操作失败' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return c.json({
      message: `批量操作完成: ${successCount}/${validIds.length} 成功`,
      results,
      summary: { total: validIds.length, success: successCount, failed: validIds.length - successCount },
    });
  } catch (error) {
    console.error('[BATCH_FAVORITE]', error);
    return c.json({ error: '批量操作失败' }, 500);
  }
}
