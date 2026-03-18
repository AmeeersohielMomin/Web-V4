/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig(nextConfig, {
  silent: true,
})
