import mongoose from "mongoose";
import logger from "../utils/logger.js";

export async function connectDB() {
	try {
		const mongoURI = process.env.MONGODB_URI;

		if (!mongoURI) {
			logger.error("MONGODB_URI not found in environment variables");
			throw new Error("MONGODB_URI not configured");
		}

		logger.info("Attempting to connect to MongoDB...");

		await mongoose.connect(mongoURI, {
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 5000,
		});

		logger.info("MongoDB connected successfully");
	} catch (error) {
		logger.error(`Database connection error: ${error.message}`);
		process.exit(1);
	}
}

export function disconnectDB() {
	return mongoose.disconnect();
}
