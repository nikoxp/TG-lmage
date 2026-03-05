import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import request from '@/utils/request';
import {
  Image as ImageIcon,
  Lock,
  Eye,
  Clock,
  User,
  Images,
  DownloadSimple,
  Copy,
  Folder,
} from '@phosphor-icons/react';
import { formatFileSize, formatDate } from '@/utils/format';
import toast from 'react-hot-toast';

const ShareViewPage = () => {
  const { id: shareId } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [viewerIndex, setViewerIndex] = useState(null);

  const fetchShare = async (pwd) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = pwd ? { password: pwd } : {};
      const res = await request.get(`/api/s/${shareId}`, { params });

      if (res.data?.requirePassword) {
        setRequirePassword(true);
        setIsLoading(false);
        return;
      }

      setData(res.data);
      setRequirePassword(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setError('密码错误');
        setRequirePassword(true);
      } else if (status === 404 || status === 410) {
        setError(err.response?.data?.error || '分享不存在或已过期');
      } else {
        setError('加载失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShare();
  }, [shareId]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    fetchShare(password);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('链接已复制');
  };

  const handleDownload = async (image) => {
    try {
      const url = window.location.origin + image.rawUrl;
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = image.fileName || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('下载失败');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-2xl font-hand text-pencil dark:text-gray-200 animate-bounce">
          正在加载分享内容...
        </div>
      </div>
    );
  }

  // Error
  if (error && !requirePassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 shadow-sketch max-w-sm w-full text-center rounded-sm">
          <ImageIcon size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-2">无法访问</h2>
          <p className="font-hand text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Password required
  if (requirePassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 shadow-sketch max-w-sm w-full rounded-sm rotate-slight-1">
          <div className="text-center mb-6">
            <Lock size={48} className="mx-auto text-marker-yellow mb-3" />
            <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200">需要密码</h2>
            <p className="font-hand text-gray-500 dark:text-gray-400 mt-1">此分享已设置访问密码</p>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              className="input-hand w-full mb-4"
              autoFocus
            />
            {error && <p className="font-hand text-red-500 text-sm mb-3">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              <Lock className="inline mr-2" size={18} /> 解锁
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Single image share
  if (data.type === 'image' && data.image) {
    const img = data.image;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 p-6 shadow-sketch rounded-sm mb-6 rotate-slight-n1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-hand text-sm text-gray-400 dark:text-gray-500">
                <User size={16} /> {data.username}
                <span className="mx-1">·</span>
                <Eye size={16} /> {data.views} 次查看
                <span className="mx-1">·</span>
                <Clock size={16} /> {formatDate(data.createdAt)}
              </div>
              <button onClick={handleCopyLink} className="btn-doodle text-sm flex items-center gap-1">
                <Copy size={16} /> 复制链接
              </button>
            </div>
            <h1 className="text-3xl font-hand font-bold text-pencil dark:text-gray-200">{img.fileName}</h1>
            <div className="flex gap-4 mt-2 font-hand text-sm text-gray-400">
              <span>{formatFileSize(img.fileSize)}</span>
              <span>{img.mimeType}</span>
              {img.tags?.length > 0 && (
                <span className="text-marker-blue">#{img.tags.join(' #')}</span>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="bg-white dark:bg-gray-800 p-4 shadow-sketch rounded-sm rotate-slight-1">
            <img
              src={window.location.origin + img.rawUrl}
              alt={img.fileName}
              className="w-full max-h-[70vh] object-contain rounded-sm"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => handleDownload(img)}
                className="btn-doodle flex items-center gap-2"
              >
                <DownloadSimple size={18} /> 下载原图
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Album share
  if (data.type === 'album' && data.album) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 p-6 shadow-sketch rounded-sm mb-6 -rotate-slight-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-hand text-sm text-gray-400 dark:text-gray-500">
                <User size={16} /> {data.username}
                <span className="mx-1">·</span>
                <Eye size={16} /> {data.views} 次查看
              </div>
              <button onClick={handleCopyLink} className="btn-doodle text-sm flex items-center gap-1">
                <Copy size={16} /> 复制链接
              </button>
            </div>
            <h1 className="text-3xl font-hand font-bold text-pencil dark:text-gray-200 flex items-center gap-2">
              <Folder weight="duotone" /> {data.album.name}
            </h1>
            {data.album.description && (
              <p className="font-hand text-gray-500 dark:text-gray-400 mt-1">{data.album.description}</p>
            )}
            <span className="font-hand text-sm text-gray-400 mt-2 flex items-center gap-1">
              <Images size={16} /> {data.album.imageCount} 张图片
            </span>
          </div>

          {/* Image Grid */}
          {viewerIndex !== null && data.images[viewerIndex] && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
              onClick={() => setViewerIndex(null)}
            >
              <img
                src={window.location.origin + data.images[viewerIndex].rawUrl}
                alt={data.images[viewerIndex].fileName}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(data.images[viewerIndex]); }}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white font-hand rounded hover:bg-white/20"
                >
                  <DownloadSimple className="inline mr-1" size={18} /> 下载
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.images.map((img, i) => (
              <div
                key={img.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden shadow-sketch hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setViewerIndex(i)}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={window.location.origin + img.rawUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2">
                  <p className="font-hand text-sm text-pencil dark:text-gray-200 truncate">{img.fileName}</p>
                  <p className="font-hand text-xs text-gray-400">{formatFileSize(img.fileSize)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ShareViewPage;
