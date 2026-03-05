/**
 * 相册管理 API
 * 支持创建、编辑、删除相册，以及向相册中添加/移除图片
 */

import { sanitizeText, validateFileId, validatePagination } from '../utils/sanitize';

// ========== 获取用户所有相册 ==========
export async function getUserAlbums(c) {
  try {
    const user = c.get('user');
    const userId = user.id;

    const albumsKey = `user:${userId}:albums`;
    const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];

    // 按更新时间倒序
    albums.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    return c.json({ albums });
  } catch (error) {
    console.error('[GET_ALBUMS]', error);
    return c.json({ error: '获取相册失败' }, 500);
  }
}

// ========== 获取单个相册详情（含图片列表） ==========
export async function getAlbumDetail(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const albumId = c.req.param('id');

    const url = new URL(c.req.url);
    const { page, limit } = validatePagination(
      url.searchParams.get('page'),
      url.searchParams.get('limit')
    );

    const albumsKey = `user:${userId}:albums`;
    const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];
    const album = albums.find(a => a.id === albumId);

    if (!album) {
      return c.json({ error: '相册不存在' }, 404);
    }

    // 获取相册中的图片详情
    const imageIds = album.images || [];
    const offset = (page - 1) * limit;
    const paginatedIds = imageIds.slice(offset, offset + limit);

    // 从用户文件列表获取图片信息
    const userFilesKey = `user:${userId}:files`;
    const userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];
    const fileMap = new Map(userFiles.map(f => [f.id, f]));

    const images = paginatedIds
      .map(id => fileMap.get(id))
      .filter(Boolean);

    return c.json({
      album: {
        ...album,
        imageCount: imageIds.length,
      },
      images,
      pagination: {
        total: imageIds.length,
        page,
        limit,
        totalPages: Math.ceil(imageIds.length / limit),
      },
    });
  } catch (error) {
    console.error('[GET_ALBUM_DETAIL]', error);
    return c.json({ error: '获取相册详情失败' }, 500);
  }
}

// ========== 创建相册 ==========
export async function createAlbum(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const body = await c.req.json();

    const name = sanitizeText(body.name, 100);
    if (!name) {
      return c.json({ error: '相册名称不能为空' }, 400);
    }

    const description = sanitizeText(body.description || '', 500);
    const coverImageId = body.coverImageId || null;

    const albumsKey = `user:${userId}:albums`;
    const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];

    // 限制最多 50 个相册
    if (albums.length >= 50) {
      return c.json({ error: '相册数量已达上限（50个）' }, 400);
    }

    // 检查重名
    if (albums.some(a => a.name === name)) {
      return c.json({ error: '相册名称已存在' }, 400);
    }

    const now = Date.now();
    const newAlbum = {
      id: `album_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      coverImageId,
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    albums.push(newAlbum);
    await c.env.img_url.put(albumsKey, JSON.stringify(albums));

    return c.json({ message: '相册创建成功', album: newAlbum }, 201);
  } catch (error) {
    console.error('[CREATE_ALBUM]', error);
    return c.json({ error: '创建相册失败' }, 500);
  }
}

// ========== 更新相册信息 ==========
export async function updateAlbum(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const albumId = c.req.param('id');
    const body = await c.req.json();

    const albumsKey = `user:${userId}:albums`;
    const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];
    const index = albums.findIndex(a => a.id === albumId);

    if (index === -1) {
      return c.json({ error: '相册不存在' }, 404);
    }

    const album = albums[index];

    if (body.name !== undefined) {
      const name = sanitizeText(body.name, 100);
      if (!name) return c.json({ error: '相册名称不能为空' }, 400);
      if (albums.some(a => a.name === name && a.id !== albumId)) {
        return c.json({ error: '相册名称已存在' }, 400);
      }
      album.name = name;
    }

    if (body.description !== undefined) {
      album.description = sanitizeText(body.description, 500);
    }

    if (body.coverImageId !== undefined) {
      album.coverImageId = body.coverImageId;
    }

    album.updatedAt = Date.now();
    albums[index] = album;
    await c.env.img_url.put(albumsKey, JSON.stringify(albums));

    return c.json({ message: '相册更新成功', album });
  } catch (error) {
    console.error('[UPDATE_ALBUM]', error);
    return c.json({ error: '更新相册失败' }, 500);
  }
}

// ========== 删除相册 ==========
export async function deleteAlbum(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const albumId = c.req.param('id');

    const albumsKey = `user:${userId}:albums`;
    const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];
    const filtered = albums.filter(a => a.id !== albumId);

    if (filtered.length === albums.length) {
      return c.json({ error: '相册不存在' }, 404);
    }

    await c.env.img_url.put(albumsKey, JSON.stringify(filtered));

    return c.json({ message: '相册已删除' });
  } catch (error) {
    console.error('[DELETE_ALBUM]', error);
    return c.json({ error: '删除相册失败' }, 500);
  }
}

// ========== 向相册添加/移除图片 ==========
export async function modifyAlbumImages(c) {
  try {
    const user = c.get('user');
    const userId = user.id;
    const albumId = c.req.param('id');
    const { imageIds, action = 'add' } = await c.req.json();

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return c.json({ error: '图片ID列表不能为空' }, 400);
    }

    if (imageIds.length > 100) {
      return c.json({ error: '单次最多操作100张图片' }, 400);
    }

    const albumsKey = `user:${userId}:albums`;
    const albums = await c.env.img_url.get(albumsKey, { type: 'json' }) || [];
    const index = albums.findIndex(a => a.id === albumId);

    if (index === -1) {
      return c.json({ error: '相册不存在' }, 404);
    }

    const album = albums[index];
    let currentImages = album.images || [];

    // 验证图片 ID
    const validIds = imageIds.filter(id => {
      const result = validateFileId(id);
      return result.valid;
    });

    if (action === 'add') {
      // 合并去重，限制最多 500 张
      const newSet = new Set([...currentImages, ...validIds]);
      currentImages = [...newSet].slice(0, 500);
    } else if (action === 'remove') {
      const removeSet = new Set(validIds);
      currentImages = currentImages.filter(id => !removeSet.has(id));
    }

    album.images = currentImages;
    album.updatedAt = Date.now();

    // 自动设置封面（如果没有封面且有图片）
    if (!album.coverImageId && currentImages.length > 0) {
      album.coverImageId = currentImages[0];
    }

    albums[index] = album;
    await c.env.img_url.put(albumsKey, JSON.stringify(albums));

    return c.json({
      message: action === 'add' ? '图片已添加到相册' : '图片已从相册移除',
      album: { ...album, imageCount: currentImages.length },
    });
  } catch (error) {
    console.error('[MODIFY_ALBUM_IMAGES]', error);
    return c.json({ error: '操作失败' }, 500);
  }
}
