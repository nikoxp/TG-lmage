import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request from '@/utils/request';

/**
 * 认证状态管理
 * 使用 Zustand + persist 中间件实现持久化
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // ========== 状态 ==========
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ========== 初始化 ==========
      initAuth: async () => {
        const token = get().token;
        const user = get().user;

        if (token && user) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp < now) {
              get().logout();
              return false;
            }

            set({ isAuthenticated: true });

            // 自动刷新：如果 token 将在 1 天内过期，后台静默刷新
            const oneDay = 60 * 60 * 24;
            if (payload.exp && payload.exp - now < oneDay) {
              get().refreshToken();
            }

            return true;
          } catch (error) {
            console.error('Token 解析失败:', error);
            get().logout();
            return false;
          }
        }

        return false;
      },

      // ========== 刷新令牌 ==========
      refreshToken: async () => {
        try {
          const response = await request.post('/api/auth/refresh');
          const { token, user } = response.data;
          set({ token, user, isAuthenticated: true });
          return true;
        } catch (error) {
          // 刷新失败时静默处理，不强制登出
          console.warn('Token 刷新失败:', error.message);
          if (error.response?.status === 401) {
            get().logout();
          }
          return false;
        }
      },

      // ========== 登录 ==========
      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await request.post('/api/auth/login', credentials);
          const { user, token } = response.data;

          // 保存用户信息和 token
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.error || '登录失败';
          set({
            error: errorMessage,
            isLoading: false,
          });

          return { success: false, error: errorMessage };
        }
      },

      // ========== 注册 ==========
      register: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await request.post('/api/auth/register', userData);
          const { user, token } = response.data;

          // 保存用户信息和 token
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.error || '注册失败';
          set({
            error: errorMessage,
            isLoading: false,
          });

          return { success: false, error: errorMessage };
        }
      },

      // ========== 退出登录 ==========
      logout: () => {
        // 清除状态
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // ========== 更新用户信息 ==========
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      // ========== 更新个人资料 ==========
      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await request.put('/api/auth/profile', profileData);
          const { user } = response.data;

          set({
            user,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.error || '更新资料失败';
          set({
            error: errorMessage,
            isLoading: false,
          });

          return { success: false, error: errorMessage };
        }
      },

      // ========== 修改密码 ==========
      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });

        try {
          const response = await request.put('/api/auth/password', {
            currentPassword,
            newPassword,
          });

          // 后端返回新 token，保存它
          const newToken = response.data?.token;
          set({
            isLoading: false,
            error: null,
            ...(newToken ? { token: newToken } : {}),
          });

          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.error || '修改密码失败';
          set({
            error: errorMessage,
            isLoading: false,
          });

          return { success: false, error: errorMessage };
        }
      },

      // ========== 更新用户头像 ==========
      updateAvatar: async (avatarUrl) => {
        set({ isLoading: true, error: null });

        try {
          const response = await request.put('/api/auth/avatar', { avatarUrl });
          const { user } = response.data;

          set({
            user,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.error || '更新头像失败';
          set({
            error: errorMessage,
            isLoading: false,
          });

          return { success: false, error: errorMessage };
        }
      },

      // ========== 获取当前用户信息 ==========
      fetchCurrentUser: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await request.get('/api/auth/user');
          const { user } = response.data;

          set({
            user,
            isLoading: false,
            error: null,
          });

          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.error || '获取用户信息失败';
          set({
            error: errorMessage,
            isLoading: false,
          });

          // 如果是 401 错误，清除认证状态
          if (error.response?.status === 401) {
            get().logout();
          }

          return { success: false, error: errorMessage };
        }
      },

      // ========== 清除错误 ==========
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化这些字段
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
