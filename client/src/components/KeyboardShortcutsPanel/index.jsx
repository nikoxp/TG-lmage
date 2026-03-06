import { useEffect, useState, memo } from 'react';
import { X, Keyboard } from '@phosphor-icons/react';

const shortcuts = [
  { group: '图库操作', items: [
    { keys: ['S'], desc: '进入/退出选择模式' },
    { keys: ['Escape'], desc: '退出选择模式' },
    { keys: ['Delete'], desc: '删除选中图片' },
    { keys: ['Ctrl', 'A'], desc: '全选' },
  ]},
  { group: '上传', items: [
    { keys: ['Ctrl', 'V'], desc: '粘贴上传图片' },
  ]},
  { group: '导航', items: [
    { keys: ['?'], desc: '显示/隐藏快捷键面板' },
  ]},
  { group: '图片查看器', items: [
    { keys: ['←'], desc: '上一张' },
    { keys: ['→'], desc: '下一张' },
    { keys: ['Escape'], desc: '关闭查看器' },
    { keys: ['+'], desc: '放大' },
    { keys: ['-'], desc: '缩小' },
    { keys: ['R'], desc: '旋转' },
  ]},
];

const KeyboardShortcutsPanel = memo(() => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[60]" onClick={() => setIsOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-lg">
        <div className="bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dashed border-gray-200 dark:border-gray-700">
            <h2 className="font-hand text-2xl font-bold text-pencil dark:text-gray-200 flex items-center gap-2">
              <Keyboard size={24} weight="duotone" /> 快捷键
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-5">
            {shortcuts.map((group) => (
              <div key={group.group}>
                <h3 className="font-hand text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {group.group}
                </h3>
                <div className="space-y-1.5">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="font-hand text-pencil dark:text-gray-200">{item.desc}</span>
                      <div className="flex gap-1">
                        {item.keys.map((key, j) => (
                          <span key={j}>
                            <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono text-pencil dark:text-gray-300 shadow-sm">
                              {key}
                            </kbd>
                            {j < item.keys.length - 1 && (
                              <span className="text-gray-400 mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-dashed border-gray-200 dark:border-gray-700 text-center">
            <span className="font-hand text-xs text-gray-400">
              按 <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-mono">?</kbd> 关闭
            </span>
          </div>
        </div>
      </div>
    </>
  );
});

KeyboardShortcutsPanel.displayName = 'KeyboardShortcutsPanel';

export default KeyboardShortcutsPanel;
