/**
 * 回收站 API
 * 软删除：移入回收站 → 可恢复 → 30天后自动清除
 */

import { validateFileId } from '../utils/sanitize';

// ========== 获取回收站列表 ==========
export async function getTrashItems(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const trashKey = `user:${userId}:trash`;
    let trashItems = await c.env.img_url.get(trashKey, { type: 'json' }) || [];

    // 自动清除超过 30 天的项目
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const expired = trashItems.filter(item => item.deletedAt < thirtyDaysAgo);
    trashItems = trashItems.filter(item => item.deletedAt >= thirtyDaysAgo);

    // 如果有过期项，清理 KV 存储
    if (expired.length > 0) {
      const deletePromises = expired.map(item => c.env.img_url.delete(item.id));
      await Promise.all([
        c.env.img_url.put(trashKey, JSON.stringify(trashItems)),
        ...deletePromises,
      ]);
    }

    // 按删除时间倒序
    trashItems.sort((a, b) => b.deletedAt - a.deletedAt);

    // 添加剩余天数
    const itemsWithExpiry = trashItems.map(item => ({
      ...item,
      daysLeft: Math.max(0, Math.ceil((item.deletedAt + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000))),
    }));

    return c.json({ items: itemsWithExpiry, total: itemsWithExpiry.length });
  } catch (error) {
    console.error('[GET_TRASH]', error);
    return c.json({ error: '获取回收站失败' }, 500);
  }
}

// ========== 移入回收站（软删除） ==========
export async function moveToTrash(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { fileIds } = await c.req.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: '文件ID列表不能为空' }, 400);
    }
    if (fileIds.length > 50) {
      return c.json({ error: '单次最多操作50个文件' }, 400);
    }

    const validIds = [];
    for (const id of fileIds) {
      const result = validateFileId(id);
      if (result.valid) validIds.push(result.value);
    }

    // 获取用户文件列表和回收站
    const userFilesKey = `user:${userId}:files`;
    const trashKey = `user:${userId}:trash`;

    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];
    let trashItems = await c.env.img_url.get(trashKey, { type: 'json' }) || [];

    // 回收站上限 200 条
    if (trashItems.length + validIds.length > 200) {
      return c.json({ error: '回收站已满（最多200项），请先清空部分项目' }, 400);
    }

    const now = Date.now();
    let movedCount = 0;

    for (const fileId of validIds) {
      const fileIndex = userFiles.findIndex(f => f.id === fileId);
      if (fileIndex === -1) continue;

      const file = userFiles[fileIndex];

      // 验证所有权
      const fileData = await c.env.img_url.getWithMetadata(fileId);
      if (!fileData?.metadata || fileData.metadata.userId !== userId) continue;

      // 移入回收站
      trashItems.push({
        ...file,
        deletedAt: now,
        originalMetadata: fileData.metadata,
      });

      // 从文件列表移除
      userFiles.splice(fileIndex, 1);
      movedCount++;
    }

    if (movedCount > 0) {
      await Promise.all([
        c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
        c.env.img_url.put(trashKey, JSON.stringify(trashItems)),
      ]);
    }

    return c.json({
      message: `已移入回收站: ${movedCount} 个文件`,
      movedCount,
    });
  } catch (error) {
    console.error('[MOVE_TO_TRASH]', error);
    return c.json({ error: '移入回收站失败' }, 500);
  }
}

// ========== 从回收站恢复 ==========
export async function restoreFromTrash(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { fileIds } = await c.req.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: '文件ID列表不能为空' }, 400);
    }

    const validIds = new Set();
    for (const id of fileIds) {
      const result = validateFileId(id);
      if (result.valid) validIds.add(result.value);
    }

    const userFilesKey = `user:${userId}:files`;
    const trashKey = `user:${userId}:trash`;

    let userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];
    let trashItems = await c.env.img_url.get(trashKey, { type: 'json' }) || [];

    let restoredCount = 0;
    const toRestore = [];
    const remaining = [];

    for (const item of trashItems) {
      if (validIds.has(item.id)) {
        // 恢复到文件列表（去掉回收站字段）
        const { deletedAt, originalMetadata, daysLeft, ...fileData } = item;
        toRestore.push(fileData);
        restoredCount++;
      } else {
        remaining.push(item);
      }
    }

    if (restoredCount > 0) {
      userFiles = [...userFiles, ...toRestore];
      await Promise.all([
        c.env.img_url.put(userFilesKey, JSON.stringify(userFiles)),
        c.env.img_url.put(trashKey, JSON.stringify(remaining)),
      ]);
    }

    return c.json({
      message: `已恢复: ${restoredCount} 个文件`,
      restoredCount,
    });
  } catch (error) {
    console.error('[RESTORE_FROM_TRASH]', error);
    return c.json({ error: '恢复失败' }, 500);
  }
}

// ========== 永久删除（从回收站彻底删除） ==========
export async function permanentDelete(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const { fileIds } = await c.req.json();

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: '文件ID列表不能为空' }, 400);
    }

    const validIds = new Set();
    for (const id of fileIds) {
      const result = validateFileId(id);
      if (result.valid) validIds.add(result.value);
    }

    const trashKey = `user:${userId}:trash`;
    let trashItems = await c.env.img_url.get(trashKey, { type: 'json' }) || [];

    const toDelete = [];
    const remaining = [];

    for (const item of trashItems) {
      if (validIds.has(item.id)) {
        toDelete.push(item.id);
      } else {
        remaining.push(item);
      }
    }

    if (toDelete.length > 0) {
      const deletePromises = toDelete.map(id => c.env.img_url.delete(id));
      await Promise.all([
        c.env.img_url.put(trashKey, JSON.stringify(remaining)),
        ...deletePromises,
      ]);
    }

    return c.json({
      message: `已永久删除: ${toDelete.length} 个文件`,
      deletedCount: toDelete.length,
    });
  } catch (error) {
    console.error('[PERMANENT_DELETE]', error);
    return c.json({ error: '永久删除失败' }, 500);
  }
}

// ========== 清空回收站 ==========
export async function emptyTrash(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const trashKey = `user:${userId}:trash`;
    const trashItems = await c.env.img_url.get(trashKey, { type: 'json' }) || [];

    if (trashItems.length === 0) {
      return c.json({ message: '回收站已经是空的' });
    }

    // 删除所有文件
    const deletePromises = trashItems.map(item => c.env.img_url.delete(item.id));
    await Promise.all([
      c.env.img_url.put(trashKey, JSON.stringify([])),
      ...deletePromises,
    ]);

    return c.json({
      message: `已清空回收站: ${trashItems.length} 个文件`,
      deletedCount: trashItems.length,
    });
  } catch (error) {
    console.error('[EMPTY_TRASH]', error);
    return c.json({ error: '清空回收站失败' }, 500);
  }
}
