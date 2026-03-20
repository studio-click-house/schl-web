import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
    experimental: {
        outputFileTracingRoot: path.join(__dirname, '../../'),
    },
    eslint: {
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