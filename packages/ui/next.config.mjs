/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    basePath: '/pro',
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
};

export default nextConfig;
