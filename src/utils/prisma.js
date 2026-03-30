import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import logger from "./logger.js";

const require = createRequire(import.meta.url);

function loadPrismaClient() {
	try {
		const prismaPkg = require("@prisma/client");
		return prismaPkg.PrismaClient;
	} catch (error) {
		const message = String(error?.message || "");
		const needsGenerate =
			message.includes("Cannot find module '.prisma/client") ||
			message.includes("did not initialize yet") ||
			message.includes("@prisma/client/default");

		if (!needsGenerate) {
			throw error;
		}

		logger.warn("Prisma client artifacts missing. Running prisma generate...");
		execSync("npx prisma generate", { stdio: "inherit" });

		const prismaPkg = require("@prisma/client");
		return prismaPkg.PrismaClient;
	}
}

const PrismaClient = loadPrismaClient();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function connectPrisma() {
	logger.info("Attempting to connect to PostgreSQL via Prisma...");
	await prisma.$connect();
	logger.info("PostgreSQL connected successfully");
}

export async function disconnectPrisma() {
	await prisma.$disconnect();
	await pool.end();
}

export default prisma;
