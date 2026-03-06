/**
 * 公开分享 API
 * 生成短链接用于分享单张图片或整个相册
 */

import { sanitizeText, validateFileId } from '../utils/sanitize';

// ========== 创建分享链接 ==========
export async function createShareLink(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const body = await c.req.json();

    const { type = 'image', targetId, expiresIn, password } = body;

    if (!targetId) {
      return c.json({ error: '分享目标不能为空' }, 400);
    }

    if (!['image', 'album'].includes(type)) {
      return c.json({ error: '分享类型无效' }, 400);
    }

    // 验证目标存在且属于用户
    if (type === 'image') {
      const idResult = validateFileId(targetId);
      if (!idResult.valid) return c.json({ error: idResult.message }, 400);

      const fileData = await c.env.img_url.getWithMetadata(idResult.value);
      if (!fileData?.metadata || fileData.metadata.userId !== userId) {
        return c.json({ error: '图片不存在或无权分享' }, 404);
      }
    } else if (type === 'album') {
      const albumsKey = `user:${userId}:albums`;
      const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];
      if (!albums.some(a => a.id === targetId)) {
        return c.json({ error: '相册不存在' }, 404);
      }
    }

    // 生成分享 ID
    const shareId = generateShareId();
    const now = Date.now();

    // 计算过期时间（默认 7 天，最长 90 天）
    let expiresAt = null;
    if (expiresIn) {
      const maxMs = 90 * 24 * 60 * 60 * 1000;
      const ms = Math.min(parseInt(expiresIn) * 60 * 1000, maxMs);
      expiresAt = now + ms;
    } else {
      expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 默认 7 天
    }

    const shareData = {
      id: shareId,
      type,
      targetId,
      userId,
      username: user.username,
      password: password ? await hashSharePassword(password) : null,
      hasPassword: !!password,
      createdAt: now,
      expiresAt,
      views: 0,
    };

    // 存储分享数据
    await c.env.img_url.put(`share:${shareId}`, JSON.stringify(shareData));

    // 更新用户分享列表
    const sharesKey = `user:${userId}:shares`;
    const shares = await c.env.img_url.get(sharesKey, { type: 'json' }) || [];
    shares.push({
      id: shareId,
      type,
      targetId,
      createdAt: now,
      expiresAt,
      hasPassword: !!password,
    });
    await c.env.img_url.put(sharesKey, JSON.stringify(shares));

    return c.json({
      message: '分享链接已创建',
      share: {
        id: shareId,
        url: `/s/${shareId}`,
        type,
        expiresAt,
        hasPassword: !!password,
      },
    }, 201);
  } catch (error) {
    console.error('[CREATE_SHARE]', error);
    return c.json({ error: '创建分享失败' }, 500);
  }
}

// ========== 获取用户所有分享 ==========
export async function getUserShares(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const sharesKey = `user:${userId}:shares`;
    let shares = await c.env.img_url.get(sharesKey, { type: 'json' }) || [];

    // 过滤已过期的
    const now = Date.now();
    const active = [];
    const expired = [];

    for (const share of shares) {
      if (share.expiresAt && share.expiresAt < now) {
        expired.push(share);
      } else {
        active.push(share);
      }
    }

    // 清理过期的分享
    if (expired.length > 0) {
      const cleanupPromises = expired.map(s => c.env.img_url.delete(`share:${s.id}`));
      await Promise.all([
        c.env.img_url.put(sharesKey, JSON.stringify(active)),
        ...cleanupPromises,
      ]);
    }

    return c.json({ shares: active });
  } catch (error) {
    console.error('[GET_SHARES]', error);
    return c.json({ error: '获取分享列表失败' }, 500);
  }
}

// ========== 删除分享链接 ==========
export async function deleteShareLink(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const shareId = c.req.param('id');

    // 验证分享属于用户
    const shareData = await c.env.img_url.get(`share:${shareId}`, { type: 'json' });
    if (!shareData || shareData.userId !== userId) {
      return c.json({ error: '分享不存在' }, 404);
    }

    // 删除分享数据
    await c.env.img_url.delete(`share:${shareId}`);

    // 从用户列表移除
    const sharesKey = `user:${userId}:shares`;
    let shares = await c.env.img_url.get(sharesKey, { type: 'json' }) || [];
    shares = shares.filter(s => s.id !== shareId);
    await c.env.img_url.put(sharesKey, JSON.stringify(shares));

    return c.json({ message: '分享已删除' });
  } catch (error) {
    console.error('[DELETE_SHARE]', error);
    return c.json({ error: '删除分享失败' }, 500);
  }
}

// ========== 访问分享内容（公开，无需认证） ==========
export async function getShareContent(c) {
  try {
    const shareId = c.req.param('id');

    const shareData = await c.env.img_url.get(`share:${shareId}`, { type: 'json' });
    if (!shareData) {
      return c.json({ error: '分享不存在或已过期' }, 404);
    }

    // 检查过期
    if (shareData.expiresAt && shareData.expiresAt < Date.now()) {
      await c.env.img_url.delete(`share:${shareId}`);
      return c.json({ error: '分享链接已过期' }, 410);
    }

    // 检查密码
    if (shareData.hasPassword) {
      const inputPassword = c.req.query('password') || c.req.header('X-Share-Password');
      if (!inputPassword) {
        return c.json({
          requirePassword: true,
          type: shareData.type,
          username: shareData.username,
          createdAt: shareData.createdAt,
        });
      }

      const valid = await verifySharePassword(inputPassword, shareData.password);
      if (!valid) {
        return c.json({ error: '密码错误' }, 403);
      }
    }

    // 更新访问次数
    shareData.views = (shareData.views || 0) + 1;
    await c.env.img_url.put(`share:${shareId}`, JSON.stringify(shareData));

    const userId = shareData.userId;

    if (shareData.type === 'image') {
      // 获取图片信息
      const userFilesKey = `user:${userId}:files`;
      const userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];
      const image = userFiles.find(f => f.id === shareData.targetId);

      if (!image) {
        return c.json({ error: '图片已被删除' }, 404);
      }

      return c.json({
        type: 'image',
        username: shareData.username,
        createdAt: shareData.createdAt,
        views: shareData.views,
        image: {
          id: image.id,
          fileName: image.fileName,
          fileSize: image.fileSize,
          mimeType: image.mimeType,
          uploadTime: image.uploadTime,
          tags: image.tags || [],
          url: image.url || `/file/${image.id}`,
          rawUrl: (image.url || `/file/${image.id}`) + '?raw=true',
        },
      });
    } else if (shareData.type === 'album') {
      // 获取相册和图片
      const albumsKey = `user:${userId}:albums`;
      const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];
      const album = albums.find(a => a.id === shareData.targetId);

      if (!album) {
        return c.json({ error: '相册已被删除' }, 404);
      }

      const userFilesKey = `user:${userId}:files`;
      const userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];
      const fileMap = new Map(userFiles.map(f => [f.id, f]));

      const images = (album.images || [])
        .map(id => fileMap.get(id))
        .filter(Boolean)
        .map(f => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          uploadTime: f.uploadTime,
          url: f.url || `/file/${f.id}`,
          rawUrl: (f.url || `/file/${f.id}`) + '?raw=true',
        }));

      return c.json({
        type: 'album',
        username: shareData.username,
        createdAt: shareData.createdAt,
        views: shareData.views,
        album: {
          name: album.name,
          description: album.description,
          imageCount: images.length,
        },
        images,
      });
    }
  } catch (error) {
    console.error('[GET_SHARE_CONTENT]', error);
    return c.json({ error: '获取分享内容失败' }, 500);
  }
}

// ========== 工具函数 ==========

function generateShareId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashSharePassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifySharePassword(input, stored) {
  const hashed = await hashSharePassword(input);
  return hashed === stored;
}
