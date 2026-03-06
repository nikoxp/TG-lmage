import { useEffect, useCallback } from 'react';

/**
 * useKeyboardShortcut - 键盘快捷键 Hook
 * @param {Object} shortcuts - 快捷键映射 { 'ctrl+k': handler, 'Escape': handler }
 * @param {boolean} enabled - 是否启用
 */
export function useKeyboardShortcut(shortcuts, enabled = true) {
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    // 忽略输入框中的快捷键（除了 Escape）
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (isInput && e.key !== 'Escape') return;

    // 构建快捷键字符串
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(e.key.toLowerCase());
    const combo = parts.join('+');

    // 也检查不带修饰符的单键
    const singleKey = e.key;

    const handler = shortcuts[combo] || shortcuts[singleKey];
    if (handler) {
      e.preventDefault();
      handler(e);
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
