/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native Node module — must be server-only
  serverExternalPackages: ['better-sqlite3'],
};

module.exports = nextConfig;
