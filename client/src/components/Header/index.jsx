import { useState, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import {
  CloudArrowUp,
  User,
  SignOut,
  SignIn,
  CaretDown,
  Image as ImageIcon,
  Star,
  Gear,
  Sun,
  Moon,
} from '@phosphor-icons/react';

const Header = memo(() => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    setShowUserMenu(false);
    navigate('/login');
  }, [logout, navigate]);

  const toggleUserMenu = useCallback(() => {
    setShowUserMenu(prev => !prev);
  }, []);

  const closeUserMenu = useCallback(() => {
    setShowUserMenu(false);
  }, []);

  const navigateToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <header className="flex justify-between items-center py-2 px-1 relative z-30">
      {/* Mobile Title */}
      <div className="md:hidden text-2xl font-hand font-bold text-pencil dark:text-gray-200 -rotate-2">
        涂鸦
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-pencil dark:hover:border-gray-400 text-gray-500 dark:text-gray-400 hover:text-pencil dark:hover:text-gray-200 transition-all hover:-translate-y-0.5"
          title={theme === 'dark' ? '切换浅色' : '切换深色'}
        >
          {theme === 'dark' ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
        </button>

        <button
          className="btn-primary flex items-center gap-2 text-pencil"
          onClick={navigateToHome}
        >
          <CloudArrowUp size={24} />
          <span className="hidden sm:inline">绘画</span>
        </button>

        {isAuthenticated ? (
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-md border border-transparent hover:border-dashed hover:border-gray-400 dark:hover:border-gray-500 transition-all font-hand text-lg"
              onClick={toggleUserMenu}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl.includes('?') ? user.avatarUrl : `${user.avatarUrl}?raw=true`} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="m-auto mt-1 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <span className="hidden sm:inline text-pencil dark:text-gray-200">{user?.username}</span>
              <CaretDown size={16} weight="bold" className="dark:text-gray-400" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeUserMenu} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 shadow-sketch border border-gray-200 dark:border-gray-700 p-2 z-20 rotate-1 transform origin-top-right">
                   {/* Tape on Dropdown */}
                   <div className="absolute -top-3 right-8 w-12 h-6 bg-white/40 dark:bg-gray-600/40 backdrop-blur-sm rotate-2 shadow-tape"></div>

                   <Link to="/dashboard" className="flex items-center gap-2 p-2 hover:bg-marker-yellow/30 dark:hover:bg-yellow-900/30 rounded font-hand text-lg dark:text-gray-200" onClick={closeUserMenu}>
                     <ImageIcon size={20} /> 我的涂鸦
                   </Link>
                   <Link to="/favorites" className="flex items-center gap-2 p-2 hover:bg-marker-pink/30 dark:hover:bg-pink-900/30 rounded font-hand text-lg dark:text-gray-200" onClick={closeUserMenu}>
                     <Star size={20} /> 收藏
                   </Link>
                   <Link to="/settings" className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded font-hand text-lg dark:text-gray-200" onClick={closeUserMenu}>
                     <Gear size={20} /> 设置
                   </Link>
                   <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 border-b border-dashed"></div>
                   <button className="w-full flex items-center gap-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded font-hand text-lg text-left" onClick={handleLogout}>
                     <SignOut size={20} /> 离开
                   </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/login" className="btn-secondary flex items-center gap-2 text-pencil">
            <SignIn size={24} />
            <span>登录</span>
          </Link>
        )}
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
