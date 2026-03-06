import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 主题状态管理
 * 支持亮色/暗色模式切换
 */
const useThemeStore = create(
  persist(
    (set, get) => ({
      // ========== 状态 ==========
      theme: 'light', // 'light' | 'dark'
      systemPreference: null, // 系统偏好

      // ========== 初始化主题 ==========
      initTheme: () => {
        // 检查系统偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        set({ systemPreference: prefersDark ? 'dark' : 'light' });

        // 如果没有保存的主题，使用系统偏好
        const savedTheme = get().theme;
        if (!savedTheme) {
          set({ theme: prefersDark ? 'dark' : 'light' });
        }

        // 监听系统主题变化
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
          const newPreference = e.matches ? 'dark' : 'light';
          set({ systemPreference: newPreference });
          
          // 如果用户没有手动设置主题，跟随系统
          if (get().theme === get().systemPreference) {
            get().setTheme(newPreference);
          }
        };

        mediaQuery.addEventListener('change', handleChange);

        // 返回清理函数
        return () => {
          mediaQuery.removeEventListener('change', handleChange);
        };
      },

      // ========== 设置主题 ==========
      setTheme: (theme) => {
        set({ theme });

        // 应用 Tailwind dark class 到 html 元素
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.add('dark-mode');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('dark-mode');
        }

        // 更新 meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute(
            'content',
            theme === 'dark' ? '#0f172a' : '#4f46e5'
          );
        }
      },

      // ========== 切换主题 ==========
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // ========== 使用系统主题 ==========
      useSystemTheme: () => {
        const systemPreference = get().systemPreference;
        if (systemPreference) {
          get().setTheme(systemPreference);
        }
      },

      // ========== 获取当前主题 ==========
      isDark: () => {
        return get().theme === 'dark';
      },

      // ========== 获取主题颜色 ==========
      getThemeColors: () => {
        const isDark = get().isDark();
        
        return {
          primary: '#4f46e5',
          primaryLight: '#6366f1',
          primaryDark: '#4338ca',
          background: isDark ? '#0f172a' : '#f8fafc',
          cardBg: isDark ? '#1e293b' : '#ffffff',
          text: isDark ? '#f1f5f9' : '#1e293b',
          textLight: isDark ? '#cbd5e1' : '#64748b',
          border: isDark ? '#334155' : '#e2e8f0',
        };
      },
    }),
    {
      name: 'theme-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化主题设置
        theme: state.theme,
      }),
    }
  )
);

export { useThemeStore };
