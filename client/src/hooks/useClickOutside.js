import { useEffect, useRef } from 'react';

/**
 * useClickOutside - 点击外部检测 Hook
 * @param {Function} handler - 点击外部时的回调
 * @param {boolean} enabled - 是否启用
 * @returns {React.RefObject} ref - 绑定到目标元素
 */
export function useClickOutside(handler, enabled = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, enabled]);

  return ref;
}
