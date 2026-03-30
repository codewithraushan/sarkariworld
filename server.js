import express from "express";
import cors from "cors";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "node:url";

import logger from "./src/utils/logger.js";
import { connectDB } from "./src/utils/mongodb.js";

import routes from "./src/route/index.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createApp() {
	const app = express();

	// Connect to MongoDB
	await connectDB();

	// Middleware
	app.use(express.json({ limit: "5mb" }));
	app.use(express.urlencoded({ extended: true, limit: "5mb" }));
	app.use(cors());

	// View engine & static files
	app.set("view engine", "pug");
	app.set("views", path.join(__dirname, "views"));
	app.use(express.static(path.join(__dirname, "public")));

	const baseUrl = String(
		process.env.BASE_URL || `http://localhost:${process.env.PORT || 6500}`
	).replace(/\/$/, "");

	app.use((req, res, next) => {
		res.locals.seo = {
			baseUrl,
			currentUrl: new URL(req.originalUrl || "/", `${baseUrl}/`).toString(),
			siteName: "Sarkari World",
			defaultImage: `${baseUrl}/favicon-96x96.png`,
		};
		next();
	});

	// Routes
	app.use("/", routes);

	app.listen(process.env.PORT, () => {
		logger.info(`Server started on port:${process.env.PORT}, Date : ${new Date()}`);
		logger.info(`Base URL : ${process.env.BASE_URL}`);
	});
}

createApp().catch((error) => {
	logger.error(`Failed to start server: ${error.message}`);
	process.exit(1);
});
