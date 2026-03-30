import express from "express";
import sanitizeHtml from "sanitize-html";
import { getAdminController } from "../controller/admin.controller.js";
import Post from "../model/Post.js";
import User from "../model/User.js";

const router = express.Router();

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

function escapeRegex(value) {
	return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
	return /^[a-f\d]{24}$/i.test(id) ? id : "";
}

router.get("/", getAdminController);

router.get("/posts", async function (req, res, next) {
	try {
		const posts = await Post.find({}, { title: 1, slug: 1, category: 1, updatedAt: 1 })
			.sort({ updatedAt: -1 })
			.lean();

		return res.render("pages/admin-posts", {
			meta: {
				title: "Existing Posts",
				description: "View saved posts from admin dashboard.",
				robots: "noindex,nofollow,noarchive",
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

		const filters = {};

		if (city) {
			filters.city = new RegExp(`^${escapeRegex(city)}$`, "i");
		}

		if (state) {
			filters.state = new RegExp(`^${escapeRegex(state)}$`, "i");
		}

		if (query) {
			const safeQuery = new RegExp(escapeRegex(query), "i");
			filters.$or = [{ name: safeQuery }, { email: safeQuery }];
		}

		const users = await User.find(filters, {
			_id: 1,
			name: 1,
			email: 1,
			mobile: 1,
			city: 1,
			state: 1,
			subscribed_at: 1,
			updatedAt: 1,
		})
			.sort({ subscribed_at: -1, createdAt: -1 })
			.limit(500)
			.lean();

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
				robots: "noindex,nofollow,noarchive",
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
			robots: "noindex,nofollow,noarchive",
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

		await User.create({
			name,
			email,
			mobile,
			city,
			state,
			is_active: true,
			subscribed_at: new Date(),
		});

		return res.redirect("/admin/users?status=created");
	} catch (error) {
		if (error && error.code === 11000) {
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

	const user = await User.findById(userId).lean();

	if (!user) {
		return res.redirect("/admin/users?status=invalid");
	}

	return res.render("pages/admin-user-form", {
		meta: {
			title: "Edit User",
			description: "Modify user from admin panel.",
			robots: "noindex,nofollow,noarchive",
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

		const existingByEmail = await User.findOne({ email, _id: { $ne: userId } }).lean();

		if (existingByEmail) {
			return res.redirect("/admin/users?status=duplicate");
		}

		await User.findByIdAndUpdate(
			userId,
			{
				name,
				email,
				mobile,
				city,
				state,
				is_active: true,
				updatedAt: new Date(),
			},
			{ runValidators: true }
		);

		return res.redirect("/admin/users?status=updated");
	} catch (error) {
		if (error && error.code === 11000) {
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

		await User.findByIdAndDelete(userId);
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
			robots: "noindex,nofollow,noarchive",
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

		const post = await Post.findOne({ slug: safeSlug }).lean();

		if (!post) {
			return res.status(404).send("Post not found.");
		}

		return res.render("editor", {
			title: `Edit ${post.title}`,
			meta: {
				title: `Edit ${post.title} | Admin`,
				description: "Edit post in admin panel.",
				robots: "noindex,nofollow,noarchive",
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

		await Post.findOneAndDelete({ slug: safeSlug });
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

		const payload = {
			title,
			description,
			slug,
			category,
			tags,
			html_content: htmlContent,
			text_content: getTextContent(htmlContent),
			status: "saved",
		};

		let savedPost;

		if (postId) {
			const existingBySlug = await Post.findOne({ slug, _id: { $ne: postId } }).lean();
			if (existingBySlug) {
				return res.status(409).json({ error: "Slug already in use." });
			}

			savedPost = await Post.findByIdAndUpdate(postId, payload, {
				new: true,
				runValidators: true,
			});

			if (!savedPost) {
				return res.status(404).json({ error: "Post not found for editing." });
			}
		} else {
			const existingBySlug = await Post.findOne({ slug }).lean();
			if (existingBySlug) {
				return res.status(409).json({ error: "Slug already in use." });
			}

			savedPost = await Post.create(payload);
		}

		return res.json({
			message: "Post saved successfully.",
			postId: String(savedPost._id),
			title: savedPost.title,
			slug: savedPost.slug,
			previewUrl: "/admin/view/" + savedPost.slug,
			editUrl: "/admin/edit/" + savedPost.slug,
		});
	} catch (error) {
		if (error && error.code === 11000) {
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

		const post = await Post.findOneAndUpdate(
			{ slug: safeSlug },
			{ $inc: { views: 1 } },
			{ new: true }
		).lean();

		if (!post) {
			return res.status(404).send("Post not found.");
		}

		const safeContent = post.html_content || "";

		return res.render("preview", {
			title: post.title + " preview",
			meta: {
				title: post.title + " preview | Admin",
				description: post.description || "Admin preview",
				robots: "noindex,nofollow,noarchive",
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
