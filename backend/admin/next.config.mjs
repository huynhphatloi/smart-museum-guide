/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ['src'] },
  // Required for the production Docker image (admin/Dockerfile).
  output: 'standalone',
};

export default nextConfig;
