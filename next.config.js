/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ["agora-token"],
  },
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      if (Array.isArray(config.externals)) {
        config.externals.push({
          crypto: "commonjs node:crypto",
          zlib: "commonjs node:zlib",
          buffer: "commonjs node:buffer",
          util: "commonjs node:util",
          stream: "commonjs node:stream",
        });
      } else if (typeof config.externals === "object") {
        Object.assign(config.externals, {
          crypto: "commonjs node:crypto",
          zlib: "commonjs node:zlib",
          buffer: "commonjs node:buffer",
          util: "commonjs node:util",
          stream: "commonjs node:stream",
        });
      }
    }
    return config;
  },

  // Security & PWA headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions policy — limit dangerous APIs
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self)",
          },
        ],
      },
      // Service Worker scope
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
