/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['100.92.133.42'],
  images: {
    // Local assets (logo) only — remote item photos use native <img> via SafeRemoteImage
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rzlmlegawumzijcrdijq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
