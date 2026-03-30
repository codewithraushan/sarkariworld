import express from "express";
import cors from "cors";
import session from "express-session";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "node:url";

import logger from "./src/utils/logger.js";
import { connectPrisma } from "./src/utils/prisma.js";

import routes from "./src/route/index.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createApp() {
	const app = express();

	// Required on Render/behind proxy so secure session cookies are set correctly.
	app.set("trust proxy", 1);

	// Connect to PostgreSQL
	await connectPrisma();

	// Middleware
	app.use(express.json({ limit: "5mb" }));
	app.use(express.urlencoded({ extended: true, limit: "5mb" }));
	app.use(cors());
	app.use(
		session({
			name: "admin.sid",
			secret:
				process.env.ADMIN_SESSION_SECRET ||
				process.env.ADMIN_PASSWORD ||
				"change-this-admin-session-secret",
			resave: false,
			saveUninitialized: false,
			proxy: process.env.NODE_ENV === "production",
			cookie: {
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				maxAge: 1000 * 60 * 60 * 12,
			},
		})
	);

	// View engine & static files
	app.set("view engine", "pug");
	app.set("views", path.join(__dirname, "views"));
	app.use(express.static(path.join(__dirname, "public")));

	const baseUrl = String(
		process.env.BASE_URL || `http://localhost:${process.env.PORT || 6500}`
	).replace(/\/$/, "");

	// Redirect www to non-www
	app.use((req, res, next) => {
		if (req.hostname.startsWith("www.")) {
			const newUrl = `${req.protocol}://${req.hostname.replace(/^www\./, "")}${req.originalUrl}`;
			return res.redirect(301, newUrl);
		}
		next();
	});

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
		logger.info("Database provider : postgresql");
	});
}

createApp().catch((error) => {
	logger.error(`Failed to start server: ${error.message}`);
	process.exit(1);
});
