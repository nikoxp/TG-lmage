/**
 * 用户认证相关API
 */
import { generateToken, hashPassword, verifyPassword } from '../utils/auth';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  sanitizeText,
  sanitizeUsername,
  sanitizeEmail,
} from '../utils/sanitize';

// ========== 辅助函数 ==========

// 从 KV 获取用户并排除密码
async function fetchUser(env, username) {
  const userJson = await env.users.get(`user:${username}`);
  if (!userJson) return null;
  return JSON.parse(userJson);
}

function stripPassword(user) {
  const { password: _, ...safe } = user;
  return safe;
}

// ========== 用户注册 ==========
export async function register(c) {
  try {
    const body = await c.req.json();

    // 验证并清理输入
    const usernameResult = validateUsername(body.username);
    if (!usernameResult.valid) return c.json({ error: usernameResult.message }, 400);

    const emailResult = validateEmail(body.email);
    if (!emailResult.valid) return c.json({ error: emailResult.message }, 400);

    const passwordResult = validatePassword(body.password);
    if (!passwordResult.valid) return c.json({ error: passwordResult.message }, 400);

    const username = usernameResult.value;
    const email = emailResult.value;

    // 检查用户名是否已存在
    const existingUser = await c.env.users.get(`user:${username}`);
    if (existingUser) {
      return c.json({ error: '用户名已存在' }, 409);
    }

    // 检查邮箱是否已存在
    const emailKey = `email:${email}`;
    const existingEmail = await c.env.users.get(emailKey);
    if (existingEmail) {
      return c.json({ error: '邮箱已被注册' }, 409);
    }

    // 哈希密码
    const hashedPassword = await hashPassword(body.password);

    // 创建用户对象
    const userId = crypto.randomUUID();
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 存储用户信息（事务式写入）
    await Promise.all([
      c.env.users.put(`user:${username}`, JSON.stringify(user)),
      c.env.users.put(`userid:${userId}`, username),
      c.env.users.put(emailKey, username),
    ]);

    // 生成令牌
    const token = await generateToken({ id: userId, username }, c.env);

    return c.json({
      message: '注册成功',
      user: stripPassword(user),
      token
    });
  } catch (error) {
    console.error('[REGISTER]', error);
    return c.json({ error: '注册失败，请稍后重试' }, 500);
  }
}

// ========== 用户登录 ==========
export async function login(c) {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: '用户名和密码都是必填项' }, 400);
    }

    // 清理用户名用于查询
    const cleanUsername = sanitizeUsername(username);

    // 获取用户信息
    const user = await fetchUser(c.env, cleanUsername);
    if (!user) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    // 验证密码（常量时间比较）
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    // 生成令牌
    const token = await generateToken({ id: user.id, username: cleanUsername }, c.env);

    return c.json({
      message: '登录成功',
      user: stripPassword(user),
      token
    });
  } catch (error) {
    console.error('[LOGIN]', error);
    return c.json({ error: '登录失败，请稍后重试' }, 500);
  }
}

// ========== 刷新令牌 ==========
export async function refreshToken(c) {
  try {
    const currentUser = c.get('user');

    // 验证用户仍然存在
    const user = await fetchUser(c.env, currentUser.username);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    // 生成新令牌
    const token = await generateToken(
      { id: user.id, username: user.username },
      c.env
    );

    return c.json({
      message: '令牌刷新成功',
      token,
      user: stripPassword(user),
    });
  } catch (error) {
    console.error('[REFRESH_TOKEN]', error);
    return c.json({ error: '令牌刷新失败' }, 500);
  }
}

// ========== 获取当前用户信息 ==========
export async function getCurrentUser(c) {
  try {
    const currentUser = c.get('user');
    const user = await fetchUser(c.env, currentUser.username);

    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    return c.json({ user: stripPassword(user) });
  } catch (error) {
    console.error('[GET_USER]', error);
    return c.json({ error: '获取用户信息失败' }, 500);
  }
}

// ========== 更新用户头像 ==========
export async function updateUserAvatar(c) {
  try {
    const currentUser = c.get('user');
    const { avatarUrl } = await c.req.json();

    if (!avatarUrl) {
      return c.json({ error: '头像链接不能为空' }, 400);
    }

    // 验证 URL
    try {
      const parsed = new URL(avatarUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return c.json({ error: '头像链接必须使用 HTTP/HTTPS 协议' }, 400);
      }
    } catch {
      return c.json({ error: '请提供有效的头像链接' }, 400);
    }

    const user = await fetchUser(c.env, currentUser.username);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    const updatedUser = {
      ...user,
      avatarUrl,
      updatedAt: Date.now()
    };

    await c.env.users.put(`user:${currentUser.username}`, JSON.stringify(updatedUser));

    return c.json({
      message: '头像更新成功',
      user: stripPassword(updatedUser)
    });
  } catch (error) {
    console.error('[UPDATE_AVATAR]', error);
    return c.json({ error: '更新头像失败' }, 500);
  }
}

// ========== 获取用户资料（含统计） ==========
export async function getUserProfile(c) {
  try {
    const currentUser = c.get('user');
    const user = await fetchUser(c.env, currentUser.username);

    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    // 获取用户统计信息
    const userFilesKey = `user:${currentUser.id}:files`;
    const userFiles = await c.env.img_url.get(userFilesKey, { type: 'json' }) || [];

    const totalImages = userFiles.length;
    const totalSize = userFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    // 获取收藏数
    const userFavoritesKey = `user:${currentUser.id}:favorites`;
    const favorites = await c.env.img_url.get(userFavoritesKey, { type: 'json' }) || [];

    // 获取标签数
    const userTagsKey = `user:${currentUser.id}:tags`;
    const tags = await c.env.img_url.get(userTagsKey, { type: 'json' }) || [];

    return c.json({
      user: {
        ...stripPassword(user),
        stats: {
          totalImages,
          totalSize,
          totalFavorites: favorites.length,
          totalTags: tags.length,
        }
      }
    });
  } catch (error) {
    console.error('[GET_PROFILE]', error);
    return c.json({ error: '获取用户资料失败' }, 500);
  }
}

// ========== 更新用户资料 ==========
export async function updateUserProfile(c) {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();
    const currentUsername = currentUser.username;

    const user = await fetchUser(c.env, currentUsername);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    let newUsername = currentUsername;
    let newEmail = user.email;

    // 验证新用户名
    if (body.username && body.username !== currentUsername) {
      const result = validateUsername(body.username);
      if (!result.valid) return c.json({ error: result.message }, 400);
      newUsername = result.value;

      const existingUser = await c.env.users.get(`user:${newUsername}`);
      if (existingUser) {
        return c.json({ error: '用户名已存在' }, 409);
      }
    }

    // 验证新邮箱
    if (body.email && body.email !== user.email) {
      const result = validateEmail(body.email);
      if (!result.valid) return c.json({ error: result.message }, 400);
      newEmail = result.value;

      const emailKey = `email:${newEmail}`;
      const existingEmail = await c.env.users.get(emailKey);
      if (existingEmail && existingEmail !== currentUsername) {
        return c.json({ error: '邮箱已被注册' }, 409);
      }

      // 更新邮箱映射
      await c.env.users.delete(`email:${user.email}`);
      await c.env.users.put(emailKey, newUsername);
    }

    // 清理 bio
    const bio = body.bio !== undefined ? sanitizeText(body.bio, 200) : user.bio;

    const updatedUser = {
      ...user,
      username: newUsername,
      email: newEmail,
      bio,
      updatedAt: Date.now()
    };

    // 如果用户名改变了，需要更新所有相关的键
    if (newUsername !== currentUsername) {
      await Promise.all([
        c.env.users.delete(`user:${currentUsername}`),
        c.env.users.put(`user:${newUsername}`, JSON.stringify(updatedUser)),
        c.env.users.put(`userid:${user.id}`, newUsername),
      ]);
    } else {
      await c.env.users.put(`user:${currentUsername}`, JSON.stringify(updatedUser));
    }

    return c.json({
      message: '资料更新成功',
      user: stripPassword(updatedUser)
    });
  } catch (error) {
    console.error('[UPDATE_PROFILE]', error);
    return c.json({ error: '更新资料失败' }, 500);
  }
}

// ========== 修改密码 ==========
export async function changePassword(c) {
  try {
    const currentUser = c.get('user');
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: '当前密码和新密码都是必填项' }, 400);
    }

    // 验证新密码强度
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.valid) {
      return c.json({ error: passwordResult.message }, 400);
    }

    const user = await fetchUser(c.env, currentUser.username);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    // 验证当前密码
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return c.json({ error: '当前密码错误' }, 401);
    }

    // 哈希新密码
    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = {
      ...user,
      password: hashedPassword,
      updatedAt: Date.now()
    };

    await c.env.users.put(`user:${currentUser.username}`, JSON.stringify(updatedUser));

    // 生成新令牌（密码改了旧的应该失效）
    const token = await generateToken(
      { id: user.id, username: user.username },
      c.env
    );

    return c.json({ message: '密码修改成功', token });
  } catch (error) {
    console.error('[CHANGE_PASSWORD]', error);
    return c.json({ error: '修改密码失败' }, 500);
  }
}
