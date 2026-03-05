import { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useImageStore } from '@/store/imageStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import {
  House,
  Image as ImageIcon,
  Star,
  Gear,
  Question,
  ChartBar,
  Folder,
  Trash,
} from '@phosphor-icons/react';

const Sidebar = memo(() => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { images } = useImageStore();
  const { favorites } = useFavoriteStore();

  // 缓存菜单项配置
  const menuItems = useMemo(() => [
    { path: '/', icon: House, label: '首页', public: true },
    { path: '/dashboard', icon: ImageIcon, label: '图库', badge: images.length, requireAuth: true },
    { path: '/favorites', icon: Star, label: '收藏', badge: favorites.size, requireAuth: true },
    { path: '/albums', icon: Folder, label: '相册', requireAuth: true },
    { path: '/stats', icon: ChartBar, label: '统计', requireAuth: true },
    { path: '/trash', icon: Trash, label: '回收站', requireAuth: true },
    { path: '/settings', icon: Gear, label: '设置', requireAuth: true },
    { path: '/help', icon: Question, label: '帮助', public: true },
  ], [images.length, favorites.size]);

  // 缓存过滤后的菜单项
  const filteredMenuItems = useMemo(() =>
    menuItems.filter((item) => item.public || (item.requireAuth && isAuthenticated)),
    [menuItems, isAuthenticated]
  );

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop Sidebar (The Spine) */}
      <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-2rem)] sticky top-4 bg-white dark:bg-gray-800 shadow-sketch rounded-lg rotate-slight-n1 border border-gray-200 dark:border-gray-700 z-40 relative">
        {/* Staples decoration */}
        <div className="absolute top-8 left-2 w-3 h-6 bg-gray-300 dark:bg-gray-600 rounded-sm shadow-inner transform -rotate-12"></div>
        <div className="absolute top-24 left-2 w-3 h-6 bg-gray-300 dark:bg-gray-600 rounded-sm shadow-inner transform rotate-6"></div>
        <div className="absolute bottom-24 left-2 w-3 h-6 bg-gray-300 dark:bg-gray-600 rounded-sm shadow-inner transform -rotate-6"></div>

        <div className="p-6 border-b-2 border-dashed border-gray-200 dark:border-gray-700 relative">
          {/* Torn edge effect */}
          <div className="absolute -right-1 top-0 bottom-0 w-2 bg-white dark:bg-gray-800" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, #f3f4f6 3px, #f3f4f6 6px)',
            clipPath: 'polygon(0 0, 100% 2%, 0 5%, 100% 8%, 0 11%, 100% 14%, 0 17%, 100% 20%, 0 23%, 100% 26%, 0 29%, 100% 32%, 0 35%, 100% 38%, 0 41%, 100% 44%, 0 47%, 100% 50%, 0 53%, 100% 56%, 0 59%, 100% 62%, 0 65%, 100% 68%, 0 71%, 100% 74%, 0 77%, 100% 80%, 0 83%, 100% 86%, 0 89%, 100% 92%, 0 95%, 100% 98%, 0 100%)'
          }}></div>

          <h1 className="text-3xl font-bold -rotate-2 text-pencil dark:text-gray-200">
            <span className="bg-marker-yellow dark:bg-yellow-900/60 px-2 transform inline-block">涂鸦</span>
            <br />
            手账
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
             const Icon = item.icon;
             const active = isActive(item.path);

             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex items-center gap-3 px-4 py-3 text-xl transition-all duration-300 group ${
                   active
                     ? 'text-pencil dark:text-gray-200 font-bold translate-x-2'
                     : 'text-gray-500 dark:text-gray-400 hover:text-pencil dark:hover:text-gray-200 hover:rotate-slight-1'
                 }`}
               >
                 <Icon size={28} weight={active ? "duotone" : "regular"} className={active ? "text-indigo-500 dark:text-indigo-400" : ""} />
                 <span className={`relative ${active ? "after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-2 after:bg-marker-pink/50 after:-z-10 after:-rotate-1" : ""}`}>
                   {item.label}
                 </span>
                 {item.badge > 0 && (
                   <span className="ml-auto text-sm font-sans bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full rotate-2">
                     {item.badge}
                   </span>
                 )}
               </Link>
             );
          })}
        </nav>

        <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-sm border-t-2 border-dashed border-gray-200 dark:border-gray-700">
           ~ 始于 2026 ~
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-2 border-dashed border-gray-300 dark:border-gray-700 z-50 px-4 py-2 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {filteredMenuItems.map((item) => {
           const Icon = item.icon;
           const active = isActive(item.path);
           return (
             <Link
               key={item.path}
               to={item.path}
               className={`flex flex-col items-center p-2 transition-transform ${active ? '-translate-y-2' : ''}`}
             >
               <div className={`p-2 rounded-full ${active ? 'bg-marker-yellow dark:bg-yellow-900/60 shadow-sketch border-2 border-pencil dark:border-gray-500' : ''}`}>
                 <Icon size={24} weight={active ? "fill" : "regular"} className="text-pencil dark:text-gray-300" />
               </div>
               <span className="text-xs mt-1 dark:text-gray-400">{item.label}</span>
             </Link>
           );
        })}
      </nav>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
