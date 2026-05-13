import { resolve } from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, '../..'),
  transpilePackages: ['@artifact-kit/deckkit', '@artifact-kit/deckkit-jsx', '@artifact-kit/deckkit-pro'],
}

export default nextConfig
