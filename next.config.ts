import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'b-bikes.dk' },
      { protocol: 'https', hostname: 'app.bikedesk.dk' },
      { protocol: 'https', hostname: 'api.c1st.com' },
    ],
  },
};

export default nextConfig;
