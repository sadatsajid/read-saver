import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Externalize linkedom and readability to avoid ES module bundling issues
  serverExternalPackages: [
    'linkedom',
    '@mozilla/readability',
    'pino',
    'pino-pretty',
    'thread-stream',
  ],
};

export default nextConfig;
