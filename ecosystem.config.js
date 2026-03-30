export default {
	apps: [
		{
			name: "SarkariWorld",
			script: "server.js",
			env: {
				NODE_ENV: "development",
			},
			env_production: {
				NODE_ENV: "production",
			},
			max_memory_restart: "500M",
			time: true,
		},
	],
};
