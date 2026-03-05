import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { uploadFiles } from '@/services/uploadService';
import request from '@/utils/request';
import toast from 'react-hot-toast';
import {
  Gear,
  Bell,
  CloudArrowUp,
  ShieldCheck,
  Warning,
  CheckSquare,
  Square,
  LockKey,
  User,
  Image as ImageIcon,
  Sun,
  Moon,
  Desktop,
  PencilSimple,
  DownloadSimple,
  Export,
} from '@phosphor-icons/react';

const SettingsPage = () => {
  const { user, changePassword, updateAvatar, updateProfile } = useAuthStore();
  const { theme, setTheme, useSystemTheme } = useThemeStore();

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileData, setProfileData] = useState({ bio: user?.bio || '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    uploadNotifications: true,
    autoSave: true,
    compressImages: false,
    defaultPrivacy: 'public',
  });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword) return toast.error('需要当前暗号！');
    if (passwordData.newPassword.length < 8) return toast.error('新暗号至少需要8个字符！');
    if (!/[a-zA-Z]/.test(passwordData.newPassword) || !/[0-9]/.test(passwordData.newPassword)) {
      return toast.error('新暗号必须包含字母和数字！');
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) return toast.error('两次暗号不一致！');

    setIsChangingPassword(true);
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        toast.success('暗号已修改！');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordSection(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('修改失败...');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const result = await updateProfile({ bio: profileData.bio });
      if (result.success) {
        toast.success('资料已更新！');
        setShowProfileEdit(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('更新失败...');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    toast.success('已勾选！');
  };

  const handleExportData = async () => {
    try {
      toast.loading('正在导出数据...', { id: 'export' });
      // Fetch all images (high limit to get all)
      const res = await request.get('/api/images', { params: { page: 1, limit: 9999 } });
      const files = res.data?.files || [];

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalImages: files.length,
        images: files.map(f => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          uploadTime: f.uploadTime,
          tags: f.tags || [],
          url: window.location.origin + (f.url || `/file/${f.id}`),
          rawUrl: window.location.origin + (f.url ? `${f.url}?raw=true` : `/file/${f.id}?raw=true`),
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lmage-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss('export');
      toast.success(`已导出 ${files.length} 条记录`);
    } catch {
      toast.dismiss('export');
      toast.error('导出失败');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('撕掉所有纸页并烧毁日记本？(注销账号)')) {
      if (window.confirm('真的吗？没法反悔的。')) {
        toast.error('还不能烧书 (功能未开放)');
      }
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('只能上传图片！');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const result = await uploadFiles([file]);
      if (result.success && result.data[0]?.success) {
        const avatarUrl = window.location.origin + result.data[0].data.src;
        const updateResult = await updateAvatar(avatarUrl);
        if (updateResult.success) {
          toast.success('头像已更新！');
        } else {
          toast.error(updateResult.error);
        }
      } else {
        toast.error('上传失败');
      }
    } catch (error) {
      toast.error('上传出错了...');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const ToggleItem = ({ label, description, checked, onChange }) => (
    <div className="flex items-start gap-3 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 last:border-0 cursor-pointer group" onClick={() => onChange(!checked)}>
      <div className="mt-1 text-pencil dark:text-gray-300 group-hover:text-marker-blue transition-colors">
        {checked ? <CheckSquare size={24} weight="fill" /> : <Square size={24} />}
      </div>
      <div>
        <h4 className="font-hand text-xl font-bold text-pencil dark:text-gray-200">{label}</h4>
        <p className="font-hand text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );

  const ThemeOption = ({ value, label, icon: Icon, active }) => (
    <button
      onClick={() => value === 'system' ? useSystemTheme() : setTheme(value)}
      className={`flex-1 flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-sm transition-all font-hand ${
        active
          ? 'border-marker-blue bg-blue-50 dark:bg-blue-900/20 text-pencil dark:text-gray-200 shadow-sketch'
          : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-400 dark:hover:border-gray-400'
      }`}
    >
      <Icon size={28} weight={active ? 'fill' : 'regular'} />
      <span className="text-lg">{label}</span>
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-n1">
          <Gear className="inline mr-2 animate-spin-slow" />
          偏好设置
        </h1>
        <p className="text-gray-400 font-hand mt-1 rotate-slight-1">
          调整你的手账风格...
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 shadow-sketch border border-gray-200 dark:border-gray-700 relative rotate-slight-1 rounded-sm">
         {/* Tape */}
         <div className="absolute -top-3 right-1/4 w-24 h-8 bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm -rotate-2 shadow-tape"></div>

         <div className="space-y-8">
            {/* Theme */}
            <section>
              <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 border-b-2 border-marker-orange inline-block pr-4 rotate-slight-n1">
                <Sun className="inline mr-1" /> 外观主题
              </h2>
              <div className="flex gap-3">
                <ThemeOption value="light" label="浅色" icon={Sun} active={theme === 'light'} />
                <ThemeOption value="dark" label="深色" icon={Moon} active={theme === 'dark'} />
                <ThemeOption value="system" label="跟随系统" icon={Desktop} active={false} />
              </div>
            </section>

            {/* Avatar & Profile */}
            <section>
              <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 border-b-2 border-marker-green inline-block pr-4 rotate-slight-1">
                <User className="inline mr-1" /> 个人形象
              </h2>
              <div className="flex items-center gap-6 mb-4">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-500 overflow-hidden flex items-center justify-center relative group">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl.includes('?') ? user.avatarUrl : `${user.avatarUrl}?raw=true`}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={48} className="text-gray-300 dark:text-gray-500" weight="thin" />
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-sm font-hand">上传中...</div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-hand text-xl font-bold text-pencil dark:text-gray-200">{user?.username}</p>
                  <p className="font-hand text-sm text-gray-400">{user?.email}</p>
                  {user?.bio && !showProfileEdit && (
                    <p className="font-hand text-sm text-gray-500 dark:text-gray-400 mt-1 italic">&quot;{user.bio}&quot;</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <label className="btn-doodle inline-flex items-center gap-2 cursor-pointer text-sm">
                      <ImageIcon size={16} />
                      <span>{user?.avatarUrl ? '更换头像' : '上传头像'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                    <button
                      onClick={() => setShowProfileEdit(!showProfileEdit)}
                      className="btn-doodle inline-flex items-center gap-2 text-sm"
                    >
                      <PencilSimple size={16} />
                      编辑简介
                    </button>
                  </div>
                </div>
              </div>
              {showProfileEdit && (
                <form onSubmit={handleProfileSubmit} className="bg-gray-50 dark:bg-gray-700 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded">
                  <textarea
                    className="input-hand bg-white dark:bg-gray-800 dark:text-gray-200 w-full resize-none h-20"
                    placeholder="写一句话介绍自己..."
                    maxLength={200}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ bio: e.target.value })}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400 font-hand">{profileData.bio.length}/200</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowProfileEdit(false)} className="btn-doodle text-sm py-1 px-3">取消</button>
                      <button type="submit" disabled={isSavingProfile} className="btn-primary text-sm py-1 px-3">
                        {isSavingProfile ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </section>

            {/* Notifications */}
            <section>
              <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 border-b-2 border-marker-yellow inline-block pr-4 rotate-slight-n1">
                <Bell className="inline mr-1" /> 通知消息
              </h2>
              <div className="space-y-1">
                <ToggleItem
                  label="邮件更新"
                  description="接收猫头鹰信件 (邮件)"
                  checked={settings.emailNotifications}
                  onChange={(v) => handleSettingChange('emailNotifications', v)}
                />
                <ToggleItem
                  label="上传提醒"
                  description="搞定的时候叮一下"
                  checked={settings.uploadNotifications}
                  onChange={(v) => handleSettingChange('uploadNotifications', v)}
                />
              </div>
            </section>

            {/* Uploads */}
            <section>
              <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 border-b-2 border-marker-blue inline-block pr-4 rotate-slight-1">
                <CloudArrowUp className="inline mr-1" /> 涂鸦设置
              </h2>
              <div className="space-y-1">
                <ToggleItem
                  label="自动保存"
                  description="自动把涂鸦存进图库"
                  checked={settings.autoSave}
                  onChange={(v) => handleSettingChange('autoSave', v)}
                />
                <ToggleItem
                  label="压缩图片"
                  description="压扁一点好省纸"
                  checked={settings.compressImages}
                  onChange={(v) => handleSettingChange('compressImages', v)}
                />

                <div className="flex items-center gap-3 py-3 border-b border-dashed border-gray-200 dark:border-gray-700">
                   <div className="mt-1"><Square size={24} className="opacity-0" /></div>
                   <div className="flex-1">
                     <h4 className="font-hand text-xl font-bold text-pencil dark:text-gray-200">默认隐私</h4>
                     <select
                       className="mt-1 bg-transparent border-b-2 border-dashed border-gray-300 dark:border-gray-600 font-hand text-lg text-pencil dark:text-gray-200 focus:border-pencil outline-none w-full max-w-xs"
                       value={settings.defaultPrivacy}
                       onChange={(e) => handleSettingChange('defaultPrivacy', e.target.value)}
                     >
                       <option value="public">公开 (给所有人看)</option>
                       <option value="private">私密 (只有我看)</option>
                     </select>
                   </div>
                </div>
              </div>
            </section>

            {/* Security */}
            <section>
              <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 border-b-2 border-marker-pink inline-block pr-4 rotate-slight-n1">
                <ShieldCheck className="inline mr-1" /> 安全防卫
              </h2>

              {!showPasswordSection ? (
                <button
                  onClick={() => setShowPasswordSection(true)}
                  className="btn-doodle w-full text-left flex justify-between items-center"
                >
                  <span>修改暗号</span>
                  <LockKey />
                </button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="bg-gray-50 dark:bg-gray-700 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded relative">
                   <button
                     type="button"
                     onClick={() => setShowPasswordSection(false)}
                     className="absolute top-2 right-2 text-gray-400 hover:text-pencil dark:hover:text-gray-200"
                   >
                     取消
                   </button>
                   <div className="space-y-3">
                     <input
                       type="password"
                       name="currentPassword"
                       placeholder="旧暗号"
                       className="input-hand bg-white dark:bg-gray-800 dark:text-gray-200"
                       value={passwordData.currentPassword}
                       onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                     />
                     <input
                       type="password"
                       name="newPassword"
                       placeholder="新暗号 (至少8位，含字母和数字)"
                       className="input-hand bg-white dark:bg-gray-800 dark:text-gray-200"
                       value={passwordData.newPassword}
                       onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                     />
                     <input
                       type="password"
                       name="confirmPassword"
                       placeholder="确认新暗号"
                       className="input-hand bg-white dark:bg-gray-800 dark:text-gray-200"
                       value={passwordData.confirmPassword}
                       onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                     />
                     <button type="submit" disabled={isChangingPassword} className="btn-primary w-full mt-2">
                       {isChangingPassword ? '正在更新...' : '更新暗号'}
                     </button>
                   </div>
                </form>
              )}
            </section>

            {/* Data Management */}
            <section>
              <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 border-b-2 border-marker-green inline-block pr-4 rotate-slight-1">
                <Export className="inline mr-1" /> 数据管理
              </h2>
              <button
                onClick={handleExportData}
                className="btn-doodle w-full text-left flex justify-between items-center"
              >
                <div>
                  <span className="font-bold">导出所有数据</span>
                  <p className="text-sm text-gray-400 dark:text-gray-500">下载所有图片链接和元数据为 JSON 文件</p>
                </div>
                <DownloadSimple size={24} />
              </button>
            </section>

            {/* Danger Zone */}
            <section className="pt-8">
               <button
                 onClick={handleDeleteAccount}
                 className="w-full border-2 border-dashed border-red-200 text-red-400 font-hand text-xl py-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 hover:border-red-400 transition-all rotate-slight-1"
               >
                 <Warning className="inline mb-1 mr-2" />
                 焚烧日记本 (注销账号)
               </button>
            </section>
         </div>
      </div>
    </div>
  );
};

export default SettingsPage;
