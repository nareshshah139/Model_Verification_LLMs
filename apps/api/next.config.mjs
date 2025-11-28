import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment from project root .env file
// This ensures both Next.js and Python backend use the same configuration
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');

console.log('🔧 Loading environment from:', envPath);
const result = config({ path: envPath });

if (result.error) {
  console.warn('⚠️  No .env file found at project root. Using environment variables.');
} else {
  console.log('✅ Environment loaded from project root .env');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ai", "@ai-sdk/openai"],
  },
  env: {
    // Make these available to the client-side (if needed)
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    CODEACT_API_URL: process.env.CODEACT_API_URL,
    INSPECTOR_URL: process.env.INSPECTOR_URL,
  },
};

export default nextConfig;

