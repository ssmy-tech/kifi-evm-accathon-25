/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: ["www.gravatar.com", "cryptologos.cc", "static.vecteezy.com"],
	},
};

module.exports = nextConfig;
