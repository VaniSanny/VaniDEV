/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        NEXT_PUBLIC_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    },
    serverExternalPackages: ['discord.js'],
};

module.exports = nextConfig;
