/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**', // 允許所有來自 Firebase Storage 的路徑
      },
    ],
  },
};

export default nextConfig;