import { createLoFiPreviewPage } from './preview-template.js';

export async function fileHandler(c) {
    const env = c.env;
    const id = c.req.param('id');
    const url = new URL(c.req.url);

    // 检查是否为下载请求
    const isDownload = url.searchParams.get('download') === 'true';

    // 检查是否为原图请求（直接嵌入）
    const isRaw = url.searchParams.get('raw') === 'true';

    // 检查是否为浏览器直接访问（而非嵌入、API调用等）
    const userAgent = c.req.header('User-Agent') || '';
    const accept = c.req.header('Accept') || '';
    const referer = c.req.header('Referer') || '';

    // 判断是否为浏览器直接访问：
    // 1. Accept头包含text/html（浏览器地址栏访问）
    // 2. 不是下载请求和原图请求
    // 3. 没有 referer 或 referer 是同域名（排除 <img> 标签嵌入）
    const currentHost = new URL(c.req.url).host;
    const refererHost = referer ? new URL(referer).host : '';
    const isBrowserDirectAccess = !isDownload && !isRaw &&
                                  accept.includes('text/html') &&
                                  (!referer || refererHost !== currentHost);

    try {
        let fileUrl = null;

        // 尝试处理通过Telegram Bot API上传的文件
        if (id.length > 30 || id.includes('.')) { // 长ID通常代表通过Bot上传的文件，或包含扩展名的文件
            const fileId = id.split('.')[0]; // 分离文件ID和扩展名
            const filePath = await getFilePath(env, fileId);

            if (filePath) {
                fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
            }
        } else {
            // 处理Telegraph链接
            fileUrl = `https://telegra.ph/file/${id}`;
        }

        // 如果找到文件URL
        if (fileUrl) {
            // 如果是下载请求，返回下载
            if (isDownload) {
                const response = await proxyFile(c, fileUrl);
                const headers = new Headers(response.headers);
                headers.set('Content-Disposition', 'attachment');
                return new Response(response.body, {
                    status: response.status,
                    headers
                });
            }

            // 如果是原图请求（图片嵌入），返回原图
            if (isRaw) {
                return await proxyFile(c, fileUrl);
            }

            // 其他所有情况，都返回预览页面
            const currentUrl = new URL(c.req.url);
            const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
            const downloadUrl = `${baseUrl}/file/${id}?download=true`;
            const rawUrl = `${baseUrl}/file/${id}?raw=true`;
            const html = createLoFiPreviewPage(baseUrl, id, rawUrl, downloadUrl);
            return c.html(html);
        }

        // 处理KV元数据
        if (env.img_url) {
            let record = await env.img_url.getWithMetadata(id);

            if (!record || !record.metadata) {
                // 初始化元数据（如不存在）
                record = {
                    metadata: {
                        ListType: "None",
                        Label: "None",
                        TimeStamp: Date.now(),
                        liked: false,
                        fileName: id,
                        fileSize: 0,
                    }
                };
                await env.img_url.put(id, "", { metadata: record.metadata });
            }

            const metadata = {
                ListType: record.metadata.ListType || "None",
                Label: record.metadata.Label || "None",
                TimeStamp: record.metadata.TimeStamp || Date.now(),
                liked: record.metadata.liked !== undefined ? record.metadata.liked : false,
                fileName: record.metadata.fileName || id,
                fileSize: record.metadata.fileSize || 0,
            };

            // 根据ListType和Label处理
            if (metadata.ListType === "Block" || metadata.Label === "adult") {
                if (referer) {
                    return c.redirect('/images/blocked.png');
                } else {
                    return c.redirect('/block-img.html');
                }
            }

            // 保存元数据
            await env.img_url.put(id, "", { metadata });
        }

        // 如果所有尝试都失败，返回404
        return c.text('文件不存在', 404);
    } catch (error) {
        return c.text('服务器错误', 500);
    }
}

/**
 * 获取Telegram文件路径
 */
async function getFilePath(env, fileId) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            return null;
        }

        const responseData = await res.json();
        const { ok, result } = responseData;

        if (ok && result) {
            return result.file_path;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

// MIME type map for content-type detection
const MIME_TYPES = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    bmp: 'image/bmp', ico: 'image/x-icon', tiff: 'image/tiff',
    avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav',
    flac: 'audio/flac', aac: 'audio/aac',
    pdf: 'application/pdf',
};

function detectMimeType(extension, fallbackContentType) {
    if (extension && MIME_TYPES[extension]) {
        return MIME_TYPES[extension];
    }
    return fallbackContentType || 'application/octet-stream';
}

/**
 * 代理文件请求
 * 支持: ETag / 条件请求(304) / Range请求 / 缓存控制 / 内容类型检测
 */
async function proxyFile(c, fileUrl) {
    const requestId = c.req.param('id');
    const originalExtension = requestId.includes('.') ? requestId.split('.').pop().toLowerCase() : '';

    // ETag: 基于文件ID生成稳定的ETag
    const etag = `"${requestId}"`;

    // 条件请求: 如果客户端发送了 If-None-Match 且匹配，直接返回 304
    const ifNoneMatch = c.req.header('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === etag) {
        return new Response(null, {
            status: 304,
            headers: {
                'ETag': etag,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    }

    // 构建上游请求头（传递 Range 头以支持断点续传）
    const fetchHeaders = {};
    const rangeHeader = c.req.header('Range');
    if (rangeHeader) {
        fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(fileUrl, {
        method: 'GET',
        headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
        return c.text('文件获取失败', response.status);
    }

    const headers = new Headers();

    // 复制上游响应头中的关键字段
    for (const key of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
        const val = response.headers.get(key);
        if (val) headers.set(key, val);
    }

    // 缓存控制
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', etag);

    // 内容类型检测
    const upstreamContentType = response.headers.get('Content-Type');
    let contentType = detectMimeType(originalExtension, upstreamContentType);

    // 特殊处理: GIF 文件被 Telegram 转为 MP4
    if (originalExtension === 'gif' && upstreamContentType?.startsWith('video/')) {
        contentType = upstreamContentType;
        headers.set('X-Original-Format', 'gif');
    }

    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', 'inline');

    // 安全头
    headers.set('X-Content-Type-Options', 'nosniff');

    // 如果上游是 Accept-Ranges 但没返回，补上
    if (!headers.has('Accept-Ranges') && response.status === 200) {
        headers.set('Accept-Ranges', 'bytes');
    }

    return new Response(response.body, {
        status: response.status, // 200 or 206
        headers,
    });
}
