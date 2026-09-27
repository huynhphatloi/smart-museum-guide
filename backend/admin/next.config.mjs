/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.SMART_MUSEUM_NEXT_DIST_DIR || '.next',
  eslint: { dirs: ['src'] },
  // Required for the production Docker image (admin/Dockerfile).
  output: 'standalone',
};

export default nextConfig;
