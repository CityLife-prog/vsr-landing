/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    localeDetection: false,
  },
  experimental: {
    serverActions: {}, // Use an empty object if you plan to use it
  },
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        os: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        http: false,
        https: false,
        url: false,
        util: false,
        querystring: false,
        zlib: false,
        assert: false,
        buffer: false,
        events: false,
      };
    }
    return config;
  },
};

export default nextConfig;
