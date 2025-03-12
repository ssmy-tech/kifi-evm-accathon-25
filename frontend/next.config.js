/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	async headers() {
		return [
			{
				// matching all API routes
				source: "/api/:path*",
				headers: [
					{ key: "Access-Control-Allow-Credentials", value: "true" },
					{ key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
					{ key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
					{ key: "Access-Control-Allow-Headers", value: "0x-version, 0x-api-key" },
				],
			},
		];
	},
	images: {
		domains: ["www.gravatar.com", "cryptologos.cc", "static.vecteezy.com", "dd.dexscreener.com", "imagedelivery.net", "kifi-acceleration-25-icons.s3.us-east-1.amazonaws.com"],
	},
	output: "standalone",
};

module.exports = nextConfig;
