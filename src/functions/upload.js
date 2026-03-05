import { authMiddleware } from "./utils/auth";

// 添加认证中间件包装
export const authenticatedUpload = async (c) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authMiddleware(c, () => upload(c));
    }

    return upload(c);
};

export async function upload(c) {
    const env = c.env;
    const user = c.get('user');
    const userId = user ? user.id : null;

    try {
        const formData = await c.req.formData();

        const files = formData.getAll('file');
        if (!files || files.length === 0) {
            return c.json({ error: '未上传文件' }, 400);
        }

        // 文件类型与大小验证
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        const ALLOWED_TYPES = ['image/', 'audio/', 'video/'];
        for (const file of files) {
            if (!file || !file.type) continue;
            if (!ALLOWED_TYPES.some(t => file.type.startsWith(t))) {
                return c.json({ error: `不支持的文件类型: ${file.type}` }, 400);
            }
            if (file.size > MAX_FILE_SIZE) {
                return c.json({ error: `文件 ${file.name} 超过 ${MAX_FILE_SIZE / 1024 / 1024}MB 限制` }, 400);
            }
        }

        const uploadResults = [];
        for (const uploadFile of files) {
            if (!uploadFile) continue;

            const fileName = uploadFile.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const isGifFile = fileExtension === 'gif' || uploadFile.type === 'image/gif';

            const telegramFormData = new FormData();
            telegramFormData.append("chat_id", env.TG_Chat_ID);

            let apiEndpoint;
            if (uploadFile.type.startsWith('image/')) {
                telegramFormData.append("document", uploadFile);
                apiEndpoint = 'sendDocument';
            } else if (uploadFile.type.startsWith('audio/')) {
                telegramFormData.append("audio", uploadFile);
                apiEndpoint = 'sendAudio';
            } else if (uploadFile.type.startsWith('video/')) {
                telegramFormData.append("video", uploadFile);
                apiEndpoint = 'sendVideo';
            } else {
                telegramFormData.append("document", uploadFile);
                apiEndpoint = 'sendDocument';
            }

            const result = await sendToTelegram(telegramFormData, apiEndpoint, env);

            if (!result.success) {
                continue;
            }

            const fileId = getFileId(result.data);

            if (!fileId) {
                continue;
            }

            const fileKey = `${fileId}.${fileExtension}`;
            const timestamp = Date.now();

            if (env.img_url) {
                const metadata = {
                    TimeStamp: timestamp,
                    ListType: "None",
                    Label: "None",
                    liked: false,
                    fileName: fileName,
                    fileSize: uploadFile.size,
                    userId: userId || "anonymous"
                };

                await env.img_url.put(fileKey, "", { metadata });

                // 用户文件列表更新（优化：直接追加，不重复读取整个列表）
                if (userId) {
                    const userFilesKey = `user:${userId}:files`;
                    const newFile = {
                        id: fileKey,
                        fileName: fileName,
                        fileSize: uploadFile.size,
                        uploadTime: timestamp,
                        url: `/file/${fileKey}`
                    };

                    // 获取现有列表并追加
                    let userFiles = await env.img_url.get(userFilesKey, { type: "json" }) || [];
                    userFiles.push(newFile);
                    await env.img_url.put(userFilesKey, JSON.stringify(userFiles));
                }
            }

            uploadResults.push({ 'src': `/file/${fileKey}` });
        }

        if (uploadResults.length === 0) {
            return c.json({ error: '所有文件上传失败' }, 500);
        }

        return c.json(uploadResults);
    } catch (error) {
        console.error('[Upload Error]', error.message || error);
        return c.json({ error: '上传处理失败，请稍后重试' }, 500);
    }
}

function getFileId(response) {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    if (result.photo) {
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}

async function sendToTelegram(formData, apiEndpoint, env, retryCount = 0) {
    const MAX_RETRIES = 2;
    const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;

    try {
        const response = await fetch(apiUrl, { method: "POST", body: formData });
        const responseData = await response.json();

        if (response.ok) {
            return { success: true, data: responseData };
        }

        return {
            success: false,
            error: responseData.description || '上传到Telegram失败'
        };
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await sendToTelegram(formData, apiEndpoint, env, retryCount + 1);
        }
        return { success: false, error: '发生网络错误' };
    }
}
