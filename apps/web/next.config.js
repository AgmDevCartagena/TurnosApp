/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@gestion-compras/ui', '@gestion-compras/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
