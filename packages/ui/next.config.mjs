/** @type {import('next').NextConfig} */

// Helper: ensure URL has protocol prefix
function ensureProtocol(url) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const backendUrl = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

const nextConfig = {
    reactStrictMode: true,
    basePath: '/pro',
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/:path*`,
            },
        ];
    },
};

export default nextConfig;
