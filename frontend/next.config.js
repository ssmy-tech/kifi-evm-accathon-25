/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		domains: ["www.gravatar.com", "cryptologos.cc", "static.vecteezy.com", "dd.dexscreener.com", "imagedelivery.net", "kifi-acceleration-25-icons.s3.us-east-1.amazonaws.com"],
	},
	output: "standalone",
};

module.exports = nextConfig;
