/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module; exclude from webpack bundling
  serverExternalPackages: ['better-sqlite3'],
  // standalone output for Docker (copies only needed node_modules)
  output: 'standalone',
  experimental: {
    // Allow server components to use better-sqlite3
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
