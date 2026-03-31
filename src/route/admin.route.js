import express from "express";
import crypto from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { getAdminController } from "../controller/admin.controller.js";
import db, { isUniqueConstraintError } from "../db/index.js";
import logger from "../utils/logger.js";

const router = express.Router();

function timingSafeEqual(a, b) {
	const left = Buffer.from(String(a || ""));
	const right = Buffer.from(String(b || ""));

	if (left.length !== right.length) {
		return false;
	}

	return crypto.timingSafeEqual(left, right);
}

function isAuthenticated(req) {
	return Boolean(req.session && req.session.isAdminAuthenticated === true);
}

function requireAdminAuth(req, res, next) {
	if (isAuthenticated(req)) {
		return next();
	}

	const nextPath =
		req.originalUrl && req.originalUrl.startsWith("/admin") ? req.originalUrl : "/admin";
	return res.redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
}

function sanitizeSlug(name) {
	return String(name || "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 120);
}

function getTextContent(html) {
	return sanitizeHtml(String(html || ""), {
		allowedTags: [],
		allowedAttributes: {},
	})
		.replace(/\s+/g, " ")
		.trim();
}

function sanitizeText(value, maxLen = 120) {
	return String(value || "")
		.trim()
		.slice(0, maxLen);
}

function sanitizeMobile(value) {
	return String(value || "")
		.trim()
		.replace(/[^\d+\s()-]/g, "")
		.slice(0, 20);
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function normalizeId(value) {
	const id = String(value || "").trim();

	if (!id) {
		return "";
	}

	if (/^[a-f\d]{24}$/i.test(id)) {
		return id;
	}

	if (/^[a-zA-Z0-9_-]{10,100}$/.test(id)) {
		return id;
	}

	return "";
}

function getRequestIp(req) {
	const forwarded = req.headers["x-forwarded-for"];

	if (Array.isArray(forwarded) && forwarded[0]) {
		return String(forwarded[0]).split(",")[0].trim();
	}

	if (typeof forwarded === "string" && forwarded) {
		return forwarded.split(",")[0].trim();
	}

	return String(req.ip || req.socket?.remoteAddress || "");
}

function getActorFromRequest(req) {
	const actorId = String(req.session?.adminId || req.session?.adminUserId || "");
	const actor = String(req.session?.adminName || req.session?.adminUserId || "");

	return {
		actor_id: actorId,
		actor,
	};
}

async function writeActivityLog(req, payload = {}) {
	const merged = {
		...payload,
		...getActorFromRequest(req),
		ip: getRequestIp(req),
		userAgent: String(req.headers["user-agent"] || ""),
	};

	const level = String(payload.level || "info").toLowerCase();

	if (level === "error") {
		logger.error(payload.message || payload.action || "Activity log", merged);
		return;
	}

	if (level === "warn") {
		logger.warn(payload.message || payload.action || "Activity log", merged);
		return;
	}

	logger.info(payload.message || payload.action || "Activity log", merged);
}

router.use((req, res, next) => {
	res.locals.isAdminAuthenticated = isAuthenticated(req);
	res.locals.adminUserId = req.session?.adminUserId || "";
	res.locals.adminName = req.session?.adminName || "";
	next();
});

router.get("/login", function (req, res) {
	if (isAuthenticated(req)) {
		return res.redirect("/admin");
	}

	const nextPath = String(req.query.next || "/admin").trim();
	const safeNextPath = nextPath.startsWith("/admin") ? nextPath : "/admin";
	const status = String(req.query.status || "")
		.trim()
		.toLowerCase();
	const errorMessage =
		status === "invalid"
			? "Invalid admin user ID or password."
			: status === "missing"
				? "Admin user is not found."
				: "";

	return res.render("pages/admin-login", {
		meta: {
			title: "Admin Login",
			description: "Login required for admin area.",
		},
		year: new Date().getFullYear(),
		nextPath: safeNextPath,
		errorMessage,
	});
});

router.post("/login", async function (req, res) {
	const userId = String(req.body?.userId || "").trim();
	const password = String(req.body?.password || "");
	const nextPath = String(req.body?.nextPath || "/admin").trim();
	const safeNextPath = nextPath.startsWith("/admin") ? nextPath : "/admin";

	if (!userId || !password) {
		await writeActivityLog(req, {
			level: "warn",
			action: "admin_login_failed",
			entity: "admin",
			message: "Admin login failed due to missing credentials",
			meta: { userId },
		});
		return res.redirect(`/admin/login?status=invalid&next=${encodeURIComponent(safeNextPath)}`);
	}

	const admin = await db.admins.findByUserId(userId);

	if (!admin) {
		await writeActivityLog(req, {
			level: "warn",
			action: "admin_login_failed",
			entity: "admin",
			message: "Admin login failed because admin user was not found",
			meta: { userId },
		});
		return res.redirect(`/admin/login?status=missing&next=${encodeURIComponent(safeNextPath)}`);
	}

	const validUser = timingSafeEqual(userId, admin.user_id || "");
	const validPassword = timingSafeEqual(password, admin.password || "");

	if (!validUser || !validPassword) {
		await writeActivityLog(req, {
			level: "warn",
			action: "admin_login_failed",
			entity: "admin",
			message: "Admin login failed due to invalid credentials",
			meta: { userId },
		});
		return res.redirect(`/admin/login?status=invalid&next=${encodeURIComponent(safeNextPath)}`);
	}

	if (!req.session) {
		await writeActivityLog(req, {
			level: "warn",
			action: "admin_login_failed",
			entity: "admin",
			message: "Admin login failed because session was unavailable",
			meta: { userId },
		});
		return res.redirect(`/admin/login?status=invalid&next=${encodeURIComponent(safeNextPath)}`);
	}

	req.session.isAdminAuthenticated = true;
	req.session.adminUserId = userId;
	req.session.adminId = String(admin._id || admin.id || "");
	req.session.adminName = String(admin.name || userId);

	await writeActivityLog(req, {
		level: "info",
		action: "admin_login_success",
		entity: "admin",
		entity_id: String(admin._id || admin.id || ""),
		message: "Admin logged in successfully",
		meta: { userId },
	});

	return req.session.save(() => res.redirect(safeNextPath));
});

router.post("/logout", function (req, res) {
	if (!req.session) {
		return res.redirect("/admin/login");
	}

	void writeActivityLog(req, {
		level: "info",
		action: "admin_logout",
		entity: "admin",
		message: "Admin logged out",
	});

	req.session.destroy(() => {
		res.clearCookie("admin.sid");
		return res.redirect("/admin/login");
	});
});

router.get("/logout", function (req, res) {
	if (!req.session) {
		return res.redirect("/admin/login");
	}

	void writeActivityLog(req, {
		level: "info",
		action: "admin_logout",
		entity: "admin",
		message: "Admin logged out",
	});

	req.session.destroy(() => {
		res.clearCookie("admin.sid");
		return res.redirect("/admin/login");
	});
});

router.use(requireAdminAuth);

router.get("/", getAdminController);

router.get("/posts", async function (req, res, next) {
	try {
		const posts = await db.posts.findAllForAdmin();

		return res.render("pages/admin-posts", {
			meta: {
				title: "Existing Posts",
				description: "View saved posts from admin dashboard.",
			},
			year: new Date().getFullYear(),
			posts,
		});
	} catch (error) {
		return next(error);
	}
});

router.get("/users", async function (req, res, next) {
	try {
		const query = String(req.query.q || "").trim();
		const city = String(req.query.city || "").trim();
		const state = String(req.query.state || "").trim();
		const actionStatus = String(req.query.status || "")
			.trim()
			.toLowerCase();

		const users = await db.users.findForAdmin({ query, city, state, limit: 500 });

		const statusMessage =
			actionStatus === "created"
				? "User created successfully."
				: actionStatus === "updated"
					? "User updated successfully."
					: actionStatus === "deleted"
						? "User deleted successfully."
						: actionStatus === "invalid"
							? "Please provide valid name and email."
							: actionStatus === "duplicate"
								? "Email already exists for another user."
								: "";

		return res.render("pages/admin-users", {
			meta: {
				title: "Subscribed Users",
				description: "View and filter subscribed users.",
			},
			year: new Date().getFullYear(),
			users,
			filters: {
				q: query,
				city,
				state,
			},
			actionStatus,
			statusMessage,
		});
	} catch (error) {
		return next(error);
	}
});

router.get("/users/new", function (req, res) {
	return res.render("pages/admin-user-form", {
		meta: {
			title: "Add User",
			description: "Add a user from admin panel.",
		},
		year: new Date().getFullYear(),
		mode: "create",
		formAction: "/admin/users/create",
		user: {
			_id: "",
			name: "",
			email: "",
			mobile: "",
			city: "",
			state: "",
		},
	});
});

router.post("/users/create", async function (req, res) {
	try {
		const name = sanitizeText(req.body?.name, 120);
		const email = sanitizeText(req.body?.email, 180).toLowerCase();
		const mobile = sanitizeMobile(req.body?.mobile);
		const city = sanitizeText(req.body?.city, 120);
		const state = sanitizeText(req.body?.state, 120);

		if (!name || !email || !isValidEmail(email)) {
			return res.redirect("/admin/users?status=invalid");
		}

		await db.users.create({
			name,
			email,
			mobile,
			city,
			state,
			is_active: true,
			subscribed_at: new Date(),
		});

		await writeActivityLog(req, {
			level: "info",
			action: "admin_user_create",
			entity: "user",
			message: "User created from admin panel",
			meta: { email, name },
		});

		return res.redirect("/admin/users?status=created");
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return res.redirect("/admin/users?status=duplicate");
		}

		return res.redirect("/admin/users?status=invalid");
	}
});

router.get("/users/edit/:id", async function (req, res) {
	const userId = normalizeId(req.params.id);

	if (!userId) {
		return res.redirect("/admin/users?status=invalid");
	}

	const user = await db.users.findById(userId);

	if (!user) {
		return res.redirect("/admin/users?status=invalid");
	}

	return res.render("pages/admin-user-form", {
		meta: {
			title: "Edit User",
			description: "Modify user from admin panel.",
		},
		year: new Date().getFullYear(),
		mode: "edit",
		formAction: `/admin/users/update/${userId}`,
		user: {
			_id: String(user._id),
			name: user.name || "",
			email: user.email || "",
			mobile: user.mobile || "",
			city: user.city || "",
			state: user.state || "",
		},
	});
});

router.post("/users/update/:id", async function (req, res) {
	try {
		const userId = normalizeId(req.params.id);

		if (!userId) {
			return res.redirect("/admin/users?status=invalid");
		}

		const name = sanitizeText(req.body?.name, 120);
		const email = sanitizeText(req.body?.email, 180).toLowerCase();
		const mobile = sanitizeMobile(req.body?.mobile);
		const city = sanitizeText(req.body?.city, 120);
		const state = sanitizeText(req.body?.state, 120);

		if (!name || !email || !isValidEmail(email)) {
			return res.redirect("/admin/users?status=invalid");
		}

		const existingByEmail = await db.users.emailExists(email, userId);

		if (existingByEmail) {
			return res.redirect("/admin/users?status=duplicate");
		}

		await db.users.updateById(userId, {
			name,
			email,
			mobile,
			city,
			state,
			is_active: true,
			updatedAt: new Date(),
		});

		await writeActivityLog(req, {
			level: "info",
			action: "admin_user_update",
			entity: "user",
			entity_id: userId,
			message: "User updated from admin panel",
			meta: { email, name },
		});

		return res.redirect("/admin/users?status=updated");
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return res.redirect("/admin/users?status=duplicate");
		}

		return res.redirect("/admin/users?status=invalid");
	}
});

router.post("/users/delete/:id", async function (req, res) {
	try {
		const userId = normalizeId(req.params.id);

		if (!userId) {
			return res.redirect("/admin/users?status=invalid");
		}

		await db.users.deleteById(userId);
		await writeActivityLog(req, {
			level: "info",
			action: "admin_user_delete",
			entity: "user",
			entity_id: userId,
			message: "User deleted from admin panel",
		});
		return res.redirect("/admin/users?status=deleted");
	} catch (error) {
		return res.redirect("/admin/users?status=invalid");
	}
});

router.get("/editor", function (req, res, next) {
	res.render("editor", {
		title: "Create Post",
		meta: {
			title: "Create Post | Admin",
			description: "Create post in admin panel.",
		},
		initialPost: {
			id: "",
			title: "",
			slug: "",
			description: "",
			category: "job",
			tags: [],
			html_content: "",
		},
	});
});

router.get("/edit/:slug", async function (req, res, next) {
	try {
		const safeSlug = sanitizeSlug(req.params.slug);

		if (!safeSlug) {
			return res.status(400).send("Invalid slug.");
		}

		const post = await db.posts.findBySlug(safeSlug);

		if (!post) {
			return res.status(404).send("Post not found.");
		}

		return res.render("editor", {
			title: `Edit ${post.title}`,
			meta: {
				title: `Edit ${post.title} | Admin`,
				description: "Edit post in admin panel.",
			},
			initialPost: {
				id: String(post._id),
				title: post.title || "",
				slug: post.slug || "",
				description: post.description || "",
				category: post.category || "job",
				tags: Array.isArray(post.tags) ? post.tags : [],
				html_content: post.html_content || "",
			},
		});
	} catch (error) {
		return next(error);
	}
});

router.post("/delete/:slug", async function (req, res, next) {
	try {
		const safeSlug = sanitizeSlug(req.params.slug);

		if (!safeSlug) {
			return res.status(400).send("Invalid slug.");
		}

		await db.posts.deleteBySlug(safeSlug);
		await writeActivityLog(req, {
			level: "info",
			action: "admin_post_delete",
			entity: "post",
			entity_id: safeSlug,
			message: "Post deleted from admin panel",
			meta: { slug: safeSlug },
		});
		return res.redirect("/admin/posts");
	} catch (error) {
		return next(error);
	}
});

router.post("/save", async function (req, res, next) {
	try {
		const postId = String(req.body.postId || "").trim();
		const title = String(req.body.title || "").trim();
		const slugInput = String(req.body.slug || "").trim();
		const description = String(req.body.description || "").trim();
		const category = String(req.body.category || "").trim();
		const htmlContent = typeof req.body.content === "string" ? req.body.content : "";
		const tagsInput = Array.isArray(req.body.tags) ? req.body.tags : [];
		const publishedAtInput = String(req.body.publishedAt || "").trim();
		const tags = tagsInput
			.map((tag) =>
				String(tag || "")
					.trim()
					.toLowerCase()
			)
			.filter(Boolean);
		const slug = sanitizeSlug(slugInput || title);

		if (!title || !slug || !description || !category) {
			return res.status(400).json({
				error: "Title, slug, description, and category are required.",
			});
		}

		// Parse published_at datetime if provided, otherwise use current time
		let publishedAt = new Date();
		if (publishedAtInput) {
			const parsedDate = new Date(publishedAtInput);
			// Check if date is valid
			if (!isNaN(parsedDate.getTime())) {
				publishedAt = parsedDate;
			}
		}

		const payload = {
			title,
			description,
			slug,
			category,
			tags,
			html_content: htmlContent,
			text_content: getTextContent(htmlContent),
			status: "saved",
			published_at: publishedAt,
			author_id: String(req.session?.adminId || req.session?.adminUserId || ""),
			author_name: String(req.session?.adminName || req.session?.adminUserId || ""),
		};

		let savedPost;

		if (postId) {
			const existingBySlug = await db.posts.slugExists(slug, postId);
			if (existingBySlug) {
				return res.status(409).json({ error: "Slug already in use." });
			}

			savedPost = await db.posts.updateById(postId, payload);

			if (!savedPost) {
				return res.status(404).json({ error: "Post not found for editing." });
			}
		} else {
			const existingBySlug = await db.posts.slugExists(slug);
			if (existingBySlug) {
				return res.status(409).json({ error: "Slug already in use." });
			}

			savedPost = await db.posts.create(payload);
		}

		await writeActivityLog(req, {
			level: "info",
			action: postId ? "admin_post_update" : "admin_post_create",
			entity: "post",
			entity_id: String(savedPost._id || savedPost.id || ""),
			message: postId ? "Post updated from admin panel" : "Post created from admin panel",
			meta: { slug: savedPost.slug, title: savedPost.title, category: savedPost.category },
		});

		return res.json({
			message: "Post saved successfully.",
			postId: String(savedPost._id),
			title: savedPost.title,
			slug: savedPost.slug,
			previewUrl: "/admin/view/" + savedPost.slug,
			editUrl: "/admin/edit/" + savedPost.slug,
		});
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return res.status(409).json({ error: "Slug already in use." });
		}

		return next(error);
	}
});

router.get("/view/:slug", async function (req, res, next) {
	try {
		const safeSlug = sanitizeSlug(req.params.slug);

		if (!safeSlug) {
			return res.status(400).send("Invalid slug.");
		}

		const post = await db.posts.findBySlugAndIncrementViews(safeSlug);

		if (!post) {
			return res.status(404).send("Post not found.");
		}

		const safeContent = post.html_content || "";

		return res.render("preview", {
			title: post.title + " preview",
			meta: {
				title: post.title + " preview | Admin",
				description: post.description || "Admin preview",
			},
			post,
			content: safeContent,
			editUrl: "/admin/edit/" + post.slug,
		});
	} catch (error) {
		return next(error);
	}
});

export default router;
