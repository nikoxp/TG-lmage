import { upload } from '@/utils/request';

/**
 * 上传服务 - 支持并发控制的批量上传
 */

/**
 * 上传单个文件（内部方法）
 * @param {File} file - 文件对象
 * @param {number} retries - 重试次数
 * @param {Function} onProgress - 单文件进度回调
 * @returns {Promise} 上传结果
 */
const uploadSingleFile = async (file, retries = 3, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await upload('/upload', formData, onProgress);
      // 后端返回的是数组，取第一个元素
      const result = Array.isArray(response.data) ? response.data[0] : response.data;
      
      if (!result || !result.src) {
        throw new Error('上传失败：服务器返回数据格式错误');
      }
      
      return {
        success: true,
        filename: file.name,
        size: file.size,
        type: file.type,
        data: result,
        uploadTime: new Date().toISOString(),
      };
    } catch (error) {
      if (attempt === retries - 1) {
        return {
          success: false,
          filename: file.name,
          size: file.size,
          type: file.type,
          error: error.response?.data?.error || error.message || '上传失败',
        };
      }
      // 重试前等待一下
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
};

/**
 * 并发池控制器（简化版）
 * @param {Array} tasks - 任务数组
 * @param {Array} files - 文件数组（用于计算总大小）
 * @param {number} concurrency - 并发数
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<Array>} 所有任务结果
 */
const runWithConcurrency = async (tasks, files, concurrency, onProgress) => {
  const results = [];
  let completed = 0;
  let index = 0;
  
  // 计算总大小
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  let uploadedSize = 0;
  const fileProgress = new Array(files.length).fill(0);

  // 执行单个任务
  const runTask = async () => {
    while (index < tasks.length) {
      const currentIndex = index++;
      const task = tasks[currentIndex];
      const file = files[currentIndex];
      
      try {
        const result = await task((percent) => {
          // 更新当前文件的进度
          fileProgress[currentIndex] = (file.size * percent) / 100;
          
          // 计算总进度
          const currentTotal = fileProgress.reduce((sum, p) => sum + p, 0);
          const totalPercent = Math.round((currentTotal / totalSize) * 100);
          
          if (onProgress) {
            onProgress({
              completed,
              total: tasks.length,
              percent: totalPercent,
              currentIndex,
              result: null,
            });
          }
        });
        
        results[currentIndex] = result;
        completed++;
        
        // 标记该文件已完成
        fileProgress[currentIndex] = file.size;
        
        if (onProgress) {
          const currentTotal = fileProgress.reduce((sum, p) => sum + p, 0);
          const totalPercent = Math.round((currentTotal / totalSize) * 100);
          
          onProgress({
            completed,
            total: tasks.length,
            percent: totalPercent,
            currentIndex,
            result,
          });
        }
      } catch (error) {
        results[currentIndex] = {
          success: false,
          error: error.message || '上传失败'
        };
        completed++;
        fileProgress[currentIndex] = file.size; // 失败也算完成
      }
    }
  };

  // 创建并发池
  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => runTask());

  await Promise.all(workers);
  return results;
};

/**
 * 批量上传文件（并发控制）
 * @param {File[]} files - 文件数组
 * @param {Function} onProgress - 进度回调
 * @param {object} options - 配置选项
 * @returns {Promise} 上传结果
 */
export const uploadFiles = async (files, onProgress, options = {}) => {
  const {
    concurrency = 5, // 默认并发数 5
    retries = 3,     // 默认重试 3 次
  } = options;

  try {
    // 创建上传任务数组
    const tasks = files.map(file => (onFileProgress) => uploadSingleFile(file, retries, onFileProgress));

    // 执行并发上传
    const results = await runWithConcurrency(tasks, files, concurrency, onProgress);

    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    return {
      success: true,
      data: results,
      summary: {
        total: results.length,
        success: successResults.length,
        failed: failedResults.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '批量上传失败',
      data: [],
    };
  }
};

/**
 * 上传单个文件（对外接口）
 * @param {File} file - 文件对象
 * @param {Function} onProgress - 进度回调
 * @returns {Promise} 上传结果
 */
export const uploadFile = async (file, onProgress) => {
  const result = await uploadFiles([file], onProgress, { concurrency: 1 });
  return result.data[0] || { success: false, error: '上传失败' };
};

/**
 * 验证文件
 * @param {File} file - 文件对象
 * @param {object} options - 验证选项
 * @returns {object} 验证结果
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 默认 10MB
    allowedTypes = ['image/*'],
  } = options;

  const errors = [];

  // 检查文件大小
  if (file.size > maxSize) {
    errors.push(`文件大小不能超过 ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }

  // 检查文件类型
  const isValidType = allowedTypes.some((type) => {
    if (type.includes('*')) {
      const [mainType] = type.split('/');
      return file.type.startsWith(mainType);
    }
    return file.type === type;
  });

  if (!isValidType) {
    errors.push('不支持的文件类型');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  uploadFile,
  uploadFiles,
  validateFile,
};
