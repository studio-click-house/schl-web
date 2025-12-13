/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Next.js bundled lint runner is not yet compatible with ESLint 9; disable it and rely on custom lint script.
        ignoreDuringBuilds: true,
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'gravatar.com',
                pathname: '/avatar/*',
            },
        ],
    },
};

export default nextConfig;
