/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ai", "@ai-sdk/openai"],
  },
};

export default nextConfig;

