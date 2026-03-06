/**
 * 用户图片管理相关API
 */
import {
  validateFileId,
  validatePagination,
  sanitizeFileName,
  sanitizeTagName,
  escapeHtml,
} from '../utils/sanitize';

// ========== 获取单张图片详情 ==========
export async function getImageDetail(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const rawId = c.req.param('id');

    const idResult = validateFileId(rawId);
    if (!idResult.valid) return c.json({ error: idResult.message }, 400);
    const fileId = idResult.value;

    // 获取文件元数据
    const fileData = await c.env.img_url.getWithMetadata(fileId);
    if (!fileData || !fileData.metadata) {
      return c.json({ error: '文件不存在' }, 404);
    }

    if (fileData.metadata.userId !== userId) {
      return c.json({ error: '无权查看此文件' }, 403);
    }

    const meta = fileData.metadata;

    // 检查收藏状态
    const favorites = await c.env.img_url.get(`user:${userId}:favorites`, { type: 'json' }) || [];
    const isFavorite = favorites.some(f => f.id === fileId || f === fileId);

    return c.json({
      file: {
        id: fileId,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        mimeType: meta.mimeType,
        uploadTime: meta.uploadTime,
        updatedAt: meta.updatedAt,
        tags: meta.tags || [],
        url: meta.url || `/file/${fileId}`,
        src: meta.url ? `${meta.url}?raw=true` : `/file/${fileId}?raw=true`,
        isFavorite,
        width: meta.width || null,
        height: meta.height || null,
      },
    });
  } catch (error) {
    console.error('[GET_IMAGE_DETAIL]', error);
    return c.json({ error: '获取图片详情失败' }, 500);
  }
}

// ========== 获取用户图片列表 ==========
export async function getUserImages(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    // 验证分页参数
    const url = new URL(c.req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );
    const offset = (page - 1) * limit;

    // 可选筛选参数
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    const tag = (url.searchParams.get('tag') || '').trim();
    const type = (url.searchParams.get('type') || '').trim().toLowerCase(); // e.g. 'image', 'video', 'png', 'jpg'

    // 获取用户的文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    // 文件名搜索
    if (query) {
      userFiles = userFiles.filter(f =>
        (f.fileName || '').toLowerCase().includes(query)
      );
    }

    // 标签过滤
    if (tag) {
      userFiles = userFiles.filter(f =>
        f.tags && f.tags.includes(tag)
      );
    }

    // 类型过滤 (支持 MIME 主类型如 'image' 或扩展名如 'png')
    if (type) {
      userFiles = userFiles.filter(f => {
        const mime = (f.mimeType || '').toLowerCase();
        const ext = (f.fileName || '').split('.').pop()?.toLowerCase() || '';
        return mime.startsWith(type) || mime.includes(type) || ext === type;
      });
    }

    // 按上传时间倒序排序
    userFiles.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));

    // 分页
    const totalFiles = userFiles.length;
    const paginatedFiles = userFiles.slice(offset, offset + limit);

    return c.json({
      files: paginatedFiles,
      pagination: {
        total: totalFiles,
        page,
        limit,
        totalPages: Math.ceil(totalFiles / limit),
        hasNext: offset + limit < totalFiles,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('[GET_IMAGES]', error);
    return c.json({ error: '获取用户图片失败' }, 500);
  }
}

// ========== 删除用户图片 ==========
export async function deleteUserImage(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const rawId = c.req.param('id');

    // 验证文件 ID
    const idResult = validateFileId(rawId);
    if (!idResult.valid) return c.json({ error: idResult.message }, 400);
    const fileId = idResult.value;

    // 获取文件元数据
    const fileMetadata = await c.env.img_url.getWithMetadata(fileId);
    if (!fileMetadata || !fileMetadata.metadata) {
      return c.json({ error: '文件不存在' }, 404);
    }

    // 检查文件所有权
    if (fileMetadata.metadata.userId !== userId) {
      return c.json({ error: '无权删除此文件' }, 403);
    }

    // 并行执行：更新文件列表 + 删除元数据
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];
    userFiles = userFiles.filter(file => file.id !== fileId);

    await Promise.all([
      c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
      c.env.img_url.delete(fileId),
    ]);

    return c.json({ message: '文件删除成功' });
  } catch (error) {
    console.error('[DELETE_IMAGE]', error);
    return c.json({ error: '删除用户图片失败' }, 500);
  }
}

// ========== 批量删除用户图片 ==========
export async function batchDeleteImages(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { fileIds } = await c.req.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: '文件ID列表不能为空' }, 400);
    }

    if (fileIds.length > 50) {
      return c.json({ error: '单次最多删除50个文件' }, 400);
    }

    // 验证所有 ID
    const validIds = [];
    for (const id of fileIds) {
      const result = validateFileId(id);
      if (result.valid) validIds.push(result.value);
    }

    // 获取用户文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    const results = [];
    const idsToDelete = [];

    // 验证所有权
    for (const fileId of validIds) {
      const fileMetadata = await c.env.img_url.getWithMetadata(fileId);
      if (!fileMetadata?.metadata) {
        results.push({ fileId, success: false, message: '文件不存在' });
        continue;
      }
      if (fileMetadata.metadata.userId !== userId) {
        results.push({ fileId, success: false, message: '无权删除' });
        continue;
      }
      idsToDelete.push(fileId);
      results.push({ fileId, success: true, message: '删除成功' });
    }

    // 批量删除
    if (idsToDelete.length > 0) {
      userFiles = userFiles.filter(f => !idsToDelete.includes(f.id));
      const deletePromises = idsToDelete.map(id => c.env.img_url.delete(id));
      await Promise.all([
        c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
        ...deletePromises,
      ]);
    }

    const successCount = results.filter(r => r.success).length;
    return c.json({
      message: `删除完成: ${successCount}/${validIds.length} 成功`,
      results,
      summary: { total: validIds.length, success: successCount, failed: validIds.length - successCount },
    });
  } catch (error) {
    console.error('[BATCH_DELETE_IMAGES]', error);
    return c.json({ error: '批量删除失败' }, 500);
  }
}

// ========== 批量添加标签 ==========
export async function batchTagImages(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { fileIds, tags, action = 'add' } = await c.req.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: '文件ID列表不能为空' }, 400);
    }
    if (!Array.isArray(tags) || tags.length === 0) {
      return c.json({ error: '标签列表不能为空' }, 400);
    }
    if (fileIds.length > 50) {
      return c.json({ error: '单次最多操作50个文件' }, 400);
    }

    // 清理标签
    const cleanTags = tags.map(t => sanitizeTagName(t)).filter(Boolean).slice(0, 20);
    if (cleanTags.length === 0) {
      return c.json({ error: '标签内容无效' }, 400);
    }

    // 验证文件 ID
    const validIds = [];
    for (const id of fileIds) {
      const result = validateFileId(id);
      if (result.valid) validIds.push(result.value);
    }

    // 获取用户文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    const updatePromises = [];
    let successCount = 0;

    for (const fileId of validIds) {
      const fileData = await c.env.img_url.getWithMetadata(fileId);
      if (!fileData?.metadata || fileData.metadata.userId !== userId) continue;

      const meta = fileData.metadata;
      let currentTags = meta.tags || [];

      if (action === 'add') {
        // 合并标签，去重
        currentTags = [...new Set([...currentTags, ...cleanTags])].slice(0, 20);
      } else if (action === 'remove') {
        currentTags = currentTags.filter(t => !cleanTags.includes(t));
      } else if (action === 'set') {
        currentTags = cleanTags;
      }

      const updatedMeta = { ...meta, tags: currentTags, updatedAt: Date.now() };
      updatePromises.push(c.env.img_url.put(fileId, '', { metadata: updatedMeta }));

      // 更新用户文件列表中的标签
      userFiles = userFiles.map(f =>
        f.id === fileId ? { ...f, tags: currentTags } : f
      );
      successCount++;
    }

    if (updatePromises.length > 0) {
      await Promise.all([
        c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
        ...updatePromises,
      ]);
    }

    return c.json({
      message: `标签操作完成: ${successCount}/${validIds.length} 成功`,
      summary: { total: validIds.length, success: successCount },
    });
  } catch (error) {
    console.error('[BATCH_TAG_IMAGES]', error);
    return c.json({ error: '批量标签操作失败' }, 500);
  }
}

// ========== 更新图片信息 ==========
export async function updateImageInfo(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const rawId = c.req.param('id');

    const idResult = validateFileId(rawId);
    if (!idResult.valid) return c.json({ error: idResult.message }, 400);
    const fileId = idResult.value;

    const body = await c.req.json();

    // 获取文件元数据
    const fileData = await c.env.img_url.getWithMetadata(fileId);
    if (!fileData || !fileData.metadata) {
      return c.json({ error: '文件不存在' }, 404);
    }

    if (fileData.metadata.userId !== userId) {
      return c.json({ error: '无权修改此文件' }, 403);
    }

    // 清理输入
    const fileName = body.fileName ? sanitizeFileName(body.fileName) : fileData.metadata.fileName;
    const tags = Array.isArray(body.tags)
      ? body.tags.map(t => sanitizeTagName(t)).filter(Boolean).slice(0, 20)
      : fileData.metadata.tags;

    // 更新元数据
    const updatedMetadata = {
      ...fileData.metadata,
      fileName,
      tags,
      updatedAt: Date.now()
    };

    // 并行更新 KV 元数据 + 用户文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    userFiles = userFiles.map(file =>
      file.id === fileId ? { ...file, fileName, tags } : file
    );

    await Promise.all([
      c.env.img_url.put(fileId, '', { metadata: updatedMetadata }),
      c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
    ]);

    return c.json({
      message: '文件信息更新成功',
      file: { id: fileId, ...updatedMetadata }
    });
  } catch (error) {
    console.error('[UPDATE_IMAGE]', error);
    return c.json({ error: '更新图片信息失败' }, 500);
  }
}

// ========== 搜索用户图片 ==========
export async function searchUserImages(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const url = new URL(c.req.url);
    const query = escapeHtml((url.searchParams.get('q') || '').trim());
    const tag = escapeHtml((url.searchParams.get('tag') || '').trim());
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );

    // 获取用户的文件列表
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    // 过滤
    if (query) {
      const lowerQuery = query.toLowerCase();
      userFiles = userFiles.filter(file =>
        (file.fileName || '').toLowerCase().includes(lowerQuery)
      );
    }

    if (tag) {
      userFiles = userFiles.filter(file =>
        file.tags && file.tags.includes(tag)
      );
    }

    // 排序
    userFiles.sort((a, b) => (b.uploadTime || 0) - (a.uploadTime || 0));

    // 分页
    const total = userFiles.length;
    const offset = (page - 1) * limit;
    const paginatedFiles = userFiles.slice(offset, offset + limit);

    return c.json({
      files: paginatedFiles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[SEARCH_IMAGES]', error);
    return c.json({ error: '搜索用户图片失败' }, 500);
  }
}
