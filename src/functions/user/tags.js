/**
 * 用户标签管理相关API
 */
import {
  sanitizeTagName,
  sanitizeText,
  validateColor,
  validateFileId,
  validatePagination,
} from '../utils/sanitize';

// ========== 获取用户标签列表 ==========
export async function getUserTags(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    // 并行获取标签和文件
    const [userTags, userFiles] = await Promise.all([
      c.env.img_url.get(`user:${userId}:tags`, { type: 'json' }).then(r => r || []),
      c.env.img_url.get(`user:${userId}:files`, { type: 'json' }).then(r => r || []),
    ]);

    // 为每个标签计算图片数量和示例图片
    const enrichedTags = userTags.map(tag => {
      const taggedImages = userFiles.filter(file =>
        file.tags && file.tags.includes(tag.name)
      );
      return {
        ...tag,
        imageCount: taggedImages.length,
        images: taggedImages.slice(0, 5).map(file => ({
          id: file.id,
          thumbnailUrl: `/file/${file.id}`,
          name: file.fileName || file.id,
        })),
      };
    });

    // 按创建时间倒序排列
    enrichedTags.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return c.json({ tags: enrichedTags, total: enrichedTags.length });
  } catch (error) {
    console.error('[GET_TAGS]', error);
    return c.json({ error: '获取标签列表失败' }, 500);
  }
}

// ========== 创建新标签 ==========
export async function createTag(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { name, description, color } = await c.req.json();

    // 验证输入
    const tagName = sanitizeTagName(name);
    if (!tagName) {
      return c.json({ error: '标签名称不能为空' }, 400);
    }

    const colorResult = validateColor(color);
    if (!colorResult.valid) {
      return c.json({ error: colorResult.message }, 400);
    }

    // 获取现有标签
    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: 'json' }) || [];

    // 限制标签总数
    if (userTags.length >= 100) {
      return c.json({ error: '标签数量已达上限（100个）' }, 400);
    }

    // 检查重名
    if (userTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      return c.json({ error: '标签名称已存在' }, 409);
    }

    const newTag = {
      id: crypto.randomUUID(),
      name: tagName,
      description: sanitizeText(description || '', 200),
      color: colorResult.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageCount: 0,
      images: [],
    };

    userTags.push(newTag);
    await c.env.img_url.put(userTagsKey, JSON.stringify(userTags));

    return c.json({ message: '标签创建成功', tag: newTag });
  } catch (error) {
    console.error('[CREATE_TAG]', error);
    return c.json({ error: '创建标签失败' }, 500);
  }
}

// ========== 更新标签 ==========
export async function updateTag(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const tagId = c.req.param('id');
    const { name, description, color } = await c.req.json();

    if (!tagId) return c.json({ error: '标签ID不能为空' }, 400);

    const tagName = sanitizeTagName(name);
    if (!tagName) return c.json({ error: '标签名称不能为空' }, 400);

    const colorResult = validateColor(color);
    if (!colorResult.valid) return c.json({ error: colorResult.message }, 400);

    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: 'json' }) || [];

    const tagIndex = userTags.findIndex(tag => tag.id === tagId);
    if (tagIndex === -1) return c.json({ error: '标签不存在' }, 404);

    const oldTag = userTags[tagIndex];

    // 检查重名
    if (userTags.find(tag => tag.id !== tagId && tag.name.toLowerCase() === tagName.toLowerCase())) {
      return c.json({ error: '标签名称已存在' }, 409);
    }

    const updatedTag = {
      ...oldTag,
      name: tagName,
      description: sanitizeText(description || '', 200),
      color: colorResult.value,
      updatedAt: new Date().toISOString(),
    };
    userTags[tagIndex] = updatedTag;

    // 如果标签名称变化，需要更新所有图片中的标签引用
    if (oldTag.name !== tagName) {
      const userFilesKey = `user:${userId}:files`;
      let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

      const affectedFiles = [];
      userFiles = userFiles.map(file => {
        if (file.tags && file.tags.includes(oldTag.name)) {
          const updatedTags = file.tags.map(t => t === oldTag.name ? tagName : t);
          affectedFiles.push({ ...file, tags: updatedTags });
          return { ...file, tags: updatedTags };
        }
        return file;
      });

      // 并行更新文件列表 + 受影响文件的元数据
      const metadataUpdates = affectedFiles.map(async (file) => {
        const fileData = await c.env.img_url.getWithMetadata(file.id);
        if (fileData?.metadata) {
          await c.env.img_url.put(file.id, '', {
            metadata: { ...fileData.metadata, tags: file.tags, updatedAt: Date.now() },
          });
        }
      });

      await Promise.all([
        c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
        ...metadataUpdates,
      ]);
    }

    await c.env.img_url.put(userTagsKey, JSON.stringify(userTags));
    return c.json({ message: '标签更新成功', tag: updatedTag });
  } catch (error) {
    console.error('[UPDATE_TAG]', error);
    return c.json({ error: '更新标签失败' }, 500);
  }
}

// ========== 删除标签 ==========
export async function deleteTag(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const tagId = c.req.param('id');

    if (!tagId) return c.json({ error: '标签ID不能为空' }, 400);

    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: 'json' }) || [];

    const tagIndex = userTags.findIndex(tag => tag.id === tagId);
    if (tagIndex === -1) return c.json({ error: '标签不存在' }, 404);

    const tagToDelete = userTags[tagIndex];
    userTags.splice(tagIndex, 1);

    // 从所有图片中移除该标签
    const userFilesKey = `user:${userId}:files`;
    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    const affectedFiles = [];
    userFiles = userFiles.map(file => {
      if (file.tags && file.tags.includes(tagToDelete.name)) {
        const updatedTags = file.tags.filter(tag => tag !== tagToDelete.name);
        affectedFiles.push({ ...file, tags: updatedTags });
        return { ...file, tags: updatedTags };
      }
      return file;
    });

    // 并行更新
    const metadataUpdates = affectedFiles.map(async (file) => {
      const fileData = await c.env.img_url.getWithMetadata(file.id);
      if (fileData?.metadata && fileData.metadata.tags?.includes(tagToDelete.name)) {
        await c.env.img_url.put(file.id, '', {
          metadata: { ...fileData.metadata, tags: file.tags, updatedAt: Date.now() },
        });
      }
    });

    await Promise.all([
      c.env.img_url.put(userTagsKey, JSON.stringify(userTags)),
      c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
      ...metadataUpdates,
    ]);

    return c.json({ message: '标签删除成功', deletedTag: tagToDelete });
  } catch (error) {
    console.error('[DELETE_TAG]', error);
    return c.json({ error: '删除标签失败' }, 500);
  }
}

// ========== 批量标签操作 ==========
export async function batchTagOperation(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { operation, tagIds, targetTagId } = await c.req.json();

    if (!operation || !Array.isArray(tagIds) || tagIds.length === 0) {
      return c.json({ error: '操作类型和标签ID列表不能为空' }, 400);
    }

    if (tagIds.length > 50) {
      return c.json({ error: '单次最多操作50个标签' }, 400);
    }

    const userTagsKey = `user:${userId}:tags`;
    let userTags = await c.env.img_url.get(userTagsKey, { type: 'json' }) || [];

    switch (operation) {
      case 'delete':
        return await batchDeleteTags(c, userId, tagIds, userTags);
      case 'merge':
        if (!targetTagId) return c.json({ error: '合并操作需要指定目标标签' }, 400);
        return await batchMergeTags(c, userId, tagIds, targetTagId, userTags);
      default:
        return c.json({ error: '不支持的操作类型' }, 400);
    }
  } catch (error) {
    console.error('[BATCH_TAG]', error);
    return c.json({ error: '批量操作失败' }, 500);
  }
}

// 批量删除标签
async function batchDeleteTags(c, userId, tagIds, userTags) {
  const tagsToDelete = userTags.filter(tag => tagIds.includes(tag.id));
  if (tagsToDelete.length === 0) {
    return c.json({ error: '没有找到要删除的标签' }, 404);
  }

  const tagNamesToDelete = new Set(tagsToDelete.map(tag => tag.name));
  userTags = userTags.filter(tag => !tagIds.includes(tag.id));

  const userFilesKey = `user:${userId}:files`;
  let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

  userFiles = userFiles.map(file => {
    if (file.tags?.some(tag => tagNamesToDelete.has(tag))) {
      return { ...file, tags: file.tags.filter(tag => !tagNamesToDelete.has(tag)) };
    }
    return file;
  });

  await Promise.all([
    c.env.img_url.put(`user:${userId}:tags`, JSON.stringify(userTags)),
    c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
  ]);

  return c.json({
    message: `成功删除 ${tagsToDelete.length} 个标签`,
    deletedTags: tagsToDelete,
  });
}

// 批量合并标签
async function batchMergeTags(c, userId, tagIds, targetTagId, userTags) {
  const targetTag = userTags.find(tag => tag.id === targetTagId);
  if (!targetTag) return c.json({ error: '目标标签不存在' }, 404);

  const tagsToMerge = userTags.filter(tag =>
    tagIds.includes(tag.id) && tag.id !== targetTagId
  );
  if (tagsToMerge.length === 0) {
    return c.json({ error: '没有找到要合并的标签' }, 404);
  }

  const tagNamesToMerge = new Set(tagsToMerge.map(tag => tag.name));
  userTags = userTags.filter(tag => !tagIds.includes(tag.id) || tag.id === targetTagId);

  const userFilesKey = `user:${userId}:files`;
  let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

  userFiles = userFiles.map(file => {
    if (file.tags?.some(tag => tagNamesToMerge.has(tag))) {
      let updatedTags = file.tags.filter(tag => !tagNamesToMerge.has(tag));
      if (!updatedTags.includes(targetTag.name)) {
        updatedTags.push(targetTag.name);
      }
      return { ...file, tags: updatedTags };
    }
    return file;
  });

  const targetTagIndex = userTags.findIndex(tag => tag.id === targetTagId);
  if (targetTagIndex !== -1) {
    userTags[targetTagIndex].updatedAt = new Date().toISOString();
  }

  await Promise.all([
    c.env.img_url.put(`user:${userId}:tags`, JSON.stringify(userTags)),
    c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
  ]);

  return c.json({
    message: `成功将 ${tagsToMerge.length} 个标签合并到 "${targetTag.name}"`,
    targetTag,
    mergedTags: tagsToMerge,
  });
}

// ========== 获取标签下的图片 ==========
export async function getTagImages(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const tagId = c.req.param('id');

    if (!tagId) return c.json({ error: '标签ID不能为空' }, 400);

    const url = new URL(c.req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );

    // 并行获取标签和文件
    const [userTags, userFiles] = await Promise.all([
      c.env.img_url.get(`user:${userId}:tags`, { type: 'json' }).then(r => r || []),
      c.env.img_url.get(`user:${userId}:files`, { type: 'json' }).then(r => r || []),
    ]);

    const tag = userTags.find(t => t.id === tagId);
    if (!tag) return c.json({ error: '标签不存在' }, 404);

    const taggedImages = userFiles
      .filter(file => file.tags && file.tags.includes(tag.name))
      .map(file => ({
        id: file.id,
        fileName: file.fileName || file.id,
        fileSize: file.fileSize || 0,
        uploadTime: file.uploadTime || Date.now(),
        url: `/file/${file.id}`,
        thumbnailUrl: `/file/${file.id}`,
        tags: file.tags || [],
        views: file.views || 0,
      }));

    // 分页
    const total = taggedImages.length;
    const offset = (page - 1) * limit;
    const paginatedImages = taggedImages.slice(offset, offset + limit);

    return c.json({
      tag,
      images: paginatedImages,
      total,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET_TAG_IMAGES]', error);
    return c.json({ error: '获取标签图片失败' }, 500);
  }
}
