/**
 * 输入清理与验证工具
 * 防止 XSS、注入攻击，统一验证逻辑
 */

// HTML 实体转义
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 清理用户名：只允许字母、数字、下划线、连字符
export function sanitizeUsername(username) {
  if (typeof username !== 'string') return '';
  return username.trim().replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '').slice(0, 32);
}

// 清理邮箱
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254);
}

// 清理标签名
export function sanitizeTagName(name) {
  if (typeof name !== 'string') return '';
  return escapeHtml(name.trim()).slice(0, 50);
}

// 清理文件名
export function sanitizeFileName(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 255);
}

// 清理通用文本（bio, description 等）
export function sanitizeText(text, maxLength = 500) {
  if (typeof text !== 'string') return '';
  return escapeHtml(text.trim()).slice(0, maxLength);
}

// 验证用户名格式
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: '用户名不能为空' };
  }
  const cleaned = username.trim();
  if (cleaned.length < 2) {
    return { valid: false, message: '用户名至少需要2个字符' };
  }
  if (cleaned.length > 32) {
    return { valid: false, message: '用户名不能超过32个字符' };
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/.test(cleaned)) {
    return { valid: false, message: '用户名只能包含字母、数字、下划线、连字符和中文' };
  }
  return { valid: true, value: cleaned };
}

// 验证邮箱格式
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: '邮箱不能为空' };
  }
  const cleaned = email.trim().toLowerCase();
  if (cleaned.length > 254) {
    return { valid: false, message: '邮箱地址过长' };
  }
  // RFC 5322 简化版
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, message: '邮箱格式不正确' };
  }
  return { valid: true, value: cleaned };
}

// 验证密码强度
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '密码不能为空' };
  }
  if (password.length < 8) {
    return { valid: false, message: '密码至少需要8个字符' };
  }
  if (password.length > 128) {
    return { valid: false, message: '密码不能超过128个字符' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含字母和数字' };
  }
  return { valid: true };
}

// 验证颜色值
export function validateColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, message: '颜色不能为空' };
  }
  // 允许 hex, rgb, hsl, 和预定义颜色名
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)) {
    return { valid: true, value: color };
  }
  if (/^(rgb|hsl)a?\([^)]+\)$/.test(color)) {
    return { valid: true, value: color };
  }
  // Tailwind 风格颜色名
  if (/^[a-z]+-[0-9]+$/.test(color) || /^[a-z]+$/.test(color)) {
    return { valid: true, value: color };
  }
  return { valid: false, message: '颜色格式不正确' };
}

// 验证文件 ID（防止路径遍历）
export function validateFileId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, message: '文件ID不能为空' };
  }
  // 禁止路径遍历字符
  if (/[\/\\]|\.\./.test(id)) {
    return { valid: false, message: '文件ID包含非法字符' };
  }
  if (id.length > 512) {
    return { valid: false, message: '文件ID过长' };
  }
  return { valid: true, value: id.trim() };
}

// 验证分页参数
export function validatePagination(page, limit) {
  const p = parseInt(page) || 1;
  const l = parseInt(limit) || 20;
  return {
    page: Math.max(1, Math.min(p, 10000)),
    limit: Math.max(1, Math.min(l, 100)),
  };
}
