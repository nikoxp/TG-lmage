/**
 * 错误处理中间件 - 捕获所有未处理异常并返回结构化错误响应
 */
export async function errorHandling(c, next) {
    try {
        await next();
    } catch (err) {
        const status = err.status || 500;
        const message = status === 500 ? '服务器内部错误' : (err.message || '请求失败');

        console.error(`[ERROR] ${c.req.method} ${c.req.path} - ${status}: ${err.message || err}`);

        return c.json(
            {
                error: message,
                ...(status === 400 && err.details ? { details: err.details } : {}),
            },
            status
        );
    }
}

/**
 * 遥测数据中间件 - 记录请求耗时与状态
 */
export async function telemetryData(c, next) {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    console.log(`[${method}] ${path} - ${status} (${duration}ms)`);
}

/**
 * CORS 中间件 - 处理跨域与安全头
 */
export async function corsHeaders(c, next) {
    if (c.req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    await next();

    c.res.headers.set('Access-Control-Allow-Origin', '*');
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * 速率限制中间件 - 基于 IP 的简单限流
 * 注意: Workers 每个 isolate 独立，分布式场景下需用 Durable Objects 或 KV
 */
const rateLimitStore = new Map();

export function rateLimit({ windowMs = 60000, max = 30, keyPrefix = 'global' } = {}) {
    return async (c, next) => {
        const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
        const key = `${keyPrefix}:${ip}`;
        const now = Date.now();

        let record = rateLimitStore.get(key);
        if (!record || now - record.start > windowMs) {
            record = { start: now, count: 0 };
        }

        record.count++;
        rateLimitStore.set(key, record);

        // 清理过期条目（防止内存泄漏）
        if (rateLimitStore.size > 10000) {
            for (const [k, v] of rateLimitStore) {
                if (now - v.start > windowMs) rateLimitStore.delete(k);
            }
        }

        const remaining = Math.max(0, max - record.count);
        c.res?.headers?.set('X-RateLimit-Limit', max.toString());
        c.res?.headers?.set('X-RateLimit-Remaining', remaining.toString());

        if (record.count > max) {
            return c.json(
                { error: '请求过于频繁，请稍后再试' },
                429
            );
        }

        await next();

        // 在响应头中设置限流信息
        c.res.headers.set('X-RateLimit-Limit', max.toString());
        c.res.headers.set('X-RateLimit-Remaining', remaining.toString());
    };
}

/**
 * 请求体大小限制中间件
 */
export function requestSizeLimit(maxBytes = 20 * 1024 * 1024) {
    return async (c, next) => {
        const contentLength = parseInt(c.req.header('content-length') || '0', 10);
        if (contentLength > maxBytes) {
            return c.json(
                { error: `请求体过大，最大允许 ${Math.round(maxBytes / 1024 / 1024)}MB` },
                413
            );
        }
        await next();
    };
}
