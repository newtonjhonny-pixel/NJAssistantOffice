/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      'prisma',
      'pptxgenjs',
      'exceljs',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pptxgenjs e exceljs usam módulos Node.js — nunca devem entrar no bundle do browser
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        pptxgenjs:  false,
        exceljs:    false,
      }
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs:             false,
        https:          false,
        http:           false,
        net:            false,
        tls:            false,
        zlib:           false,
        stream:         false,
        'node:fs':      false,
        'node:https':   false,
        'node:http':    false,
        'node:net':     false,
        'node:tls':     false,
        'node:zlib':    false,
        'node:stream':  false,
        'node:buffer':  false,
        'node:path':    false,
        'node:os':      false,
        'node:crypto':  false,
        'node:events':  false,
      }
    }
    return config
  },
};

export default nextConfig;
