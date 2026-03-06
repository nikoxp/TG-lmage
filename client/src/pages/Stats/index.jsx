import { useEffect } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { formatFileSize } from '@/utils/format';
import {
  Images,
  HardDrives,
  Star,
  Tag,
  ChartBar,
  FileImage,
  TrendUp,
  Clock,
} from '@phosphor-icons/react';

const StatsPage = () => {
  const { overview, storage, isLoading, fetchStats, fetchStorage } = useStatsStore();

  useEffect(() => {
    fetchStats(true);
    fetchStorage();
  }, [fetchStats, fetchStorage]);

  if (isLoading && !overview) {
    return (
      <div className="flex justify-center py-20 font-hand text-xl text-pencil dark:text-gray-200 animate-bounce">
        正在统计涂鸦数据...
      </div>
    );
  }

  const stats = overview?.overview || {};
  const typeDistribution = overview?.typeDistribution || {};
  const dailyUploads = overview?.dailyUploads || {};
  const recentUploads = overview?.recentUploads || [];

  // 最近7天上传数据
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split('T')[0];
    const dayLabel = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    last7Days.push({ date: key, label: dayLabel, count: dailyUploads[key] || 0 });
  }
  const maxDaily = Math.max(...last7Days.map(d => d.count), 1);

  // 文件类型排序
  const typeEntries = Object.entries(typeDistribution).sort((a, b) => b[1] - a[1]);
  const totalTypeCount = typeEntries.reduce((sum, [, count]) => sum + count, 0) || 1;

  // 存储按类型
  const storageByType = storage?.storageByType || {};
  const storageEntries = Object.entries(storageByType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-hand font-bold text-pencil dark:text-gray-200 rotate-slight-1">
          <ChartBar className="inline mr-2" weight="duotone" />
          数据统计
        </h1>
        <p className="text-gray-400 font-hand mt-1 rotate-slight-n1">
          你的涂鸦日记一览
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Images size={28} className="text-marker-blue" />}
          value={stats.totalImages || 0}
          label="总图片数"
          rotation="rotate-slight-1"
        />
        <StatCard
          icon={<HardDrives size={28} className="text-marker-yellow" />}
          value={formatFileSize(stats.totalStorage || 0)}
          label="存储使用"
          rotation="-rotate-1"
        />
        <StatCard
          icon={<Star size={28} className="text-red-400" weight="fill" />}
          value={stats.totalFavorites || 0}
          label="收藏数量"
          rotation="rotate-slight-1"
        />
        <StatCard
          icon={<Tag size={28} className="text-green-500" />}
          value={stats.totalTags || 0}
          label="标签数量"
          rotation="-rotate-slight-1"
        />
      </div>

      {/* Upload Activity (Last 7 Days) */}
      <div className="bg-white dark:bg-gray-800 p-6 shadow-sketch border border-gray-200 dark:border-gray-700 rounded-sm mb-8 rotate-slight-n1">
        <div className="absolute -top-3 left-8 w-12 h-5 bg-white/40 dark:bg-gray-600/40 backdrop-blur-sm rotate-2 shadow-tape" />
        <h2 className="text-2xl font-hand font-bold text-pencil dark:text-gray-200 mb-6 flex items-center gap-2">
          <TrendUp /> 最近7天上传
        </h2>
        <div className="flex items-end justify-between gap-2 h-40">
          {last7Days.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-hand text-gray-400">{day.count}</span>
              <div className="w-full flex justify-center">
                <div
                  className="w-8 bg-marker-blue/60 dark:bg-blue-500/40 rounded-t-sm border border-marker-blue/80 dark:border-blue-500/60 transition-all duration-500"
                  style={{ height: `${Math.max((day.count / maxDaily) * 120, 4)}px` }}
                />
              </div>
              <span className="text-xs font-hand text-gray-500 dark:text-gray-400">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* File Type Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sketch border border-gray-200 dark:border-gray-700 rounded-sm rotate-1">
          <h2 className="text-xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 flex items-center gap-2">
            <FileImage /> 文件类型
          </h2>
          {typeEntries.length === 0 ? (
            <p className="font-hand text-gray-400">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {typeEntries.slice(0, 6).map(([ext, count]) => {
                const percent = Math.round((count / totalTypeCount) * 100);
                return (
                  <div key={ext}>
                    <div className="flex justify-between font-hand text-sm mb-1">
                      <span className="text-pencil dark:text-gray-200 uppercase font-bold">.{ext}</span>
                      <span className="text-gray-400">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-marker-yellow rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Storage By Type */}
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sketch border border-gray-200 dark:border-gray-700 rounded-sm -rotate-1">
          <h2 className="text-xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 flex items-center gap-2">
            <HardDrives /> 存储分布
          </h2>
          {storageEntries.length === 0 ? (
            <p className="font-hand text-gray-400">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {storageEntries.map(([type, bytes]) => {
                const totalBytes = storage?.totalStorage || 1;
                const percent = Math.round((bytes / totalBytes) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between font-hand text-sm mb-1">
                      <span className="text-pencil dark:text-gray-200 capitalize font-bold">{type}</span>
                      <span className="text-gray-400">{formatFileSize(bytes)} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      {recentUploads.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 shadow-sketch border border-gray-200 dark:border-gray-700 rounded-sm -rotate-slight-1 mb-8">
          <h2 className="text-xl font-hand font-bold text-pencil dark:text-gray-200 mb-4 flex items-center gap-2">
            <Clock /> 最近上传
          </h2>
          <div className="space-y-2">
            {recentUploads.map((file) => (
              <div key={file.id} className="flex items-center justify-between py-2 border-b border-dashed border-gray-100 dark:border-gray-700 last:border-0">
                <span className="font-hand text-pencil dark:text-gray-200 truncate flex-1 mr-4">{file.fileName}</span>
                <div className="flex gap-4 text-sm font-hand text-gray-400 flex-shrink-0">
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>{file.uploadTime ? new Date(file.uploadTime).toLocaleDateString('zh-CN') : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Largest File */}
      {overview?.largestFile && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 border border-dashed border-marker-yellow dark:border-yellow-800 rounded-sm rotate-slight-1 mb-8">
          <span className="font-hand text-sm text-gray-500 dark:text-gray-400">最大文件：</span>
          <span className="font-hand font-bold text-pencil dark:text-gray-200 ml-2">{overview.largestFile.fileName}</span>
          <span className="font-hand text-gray-400 ml-2">({formatFileSize(overview.largestFile.fileSize)})</span>
        </div>
      )}
    </div>
  );
};

/**
 * 统计卡片子组件
 */
const StatCard = ({ icon, value, label, rotation = '' }) => (
  <div className={`bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-4 rounded-sm text-center ${rotation} hover:rotate-0 transition-transform`}>
    <div className="mb-2">{icon}</div>
    <div className="text-3xl font-hand font-bold text-pencil dark:text-gray-200">{value}</div>
    <div className="text-sm font-hand text-gray-400">{label}</div>
  </div>
);

export default StatsPage;
