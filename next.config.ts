/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["tesseract.js"],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
