import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false, // sem o "N" no canto durante a apresentação
}

export default nextConfig
