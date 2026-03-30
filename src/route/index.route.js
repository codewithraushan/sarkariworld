import adminRouter from "./admin.route.js";
import express from "express";
import Post from "../model/Post.js";
import User from "../model/User.js";

const router = express.Router();
const ALLOWED_CATEGORIES = new Set([
	"job",
	"result",
	"admit-card",
	"answer-key",
	"syllabus",
	"admission",
	"important",
]);
const CATEGORY_LABELS = {
	job: "Latest Jobs",
	result: "Results",
	"admit-card": "Admit Card",
	"answer-key": "Answer Key",
	syllabus: "Syllabus",
	admission: "Admission",
	important: "Important",
};

function renderPage(res, view, meta) {
	return res.render(view, {
		meta,
		year: new Date().getFullYear(),
	});
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

function stripLeadingTitleH1(html, title) {
	const safeHtml = String(html || "");
	const safeTitle = String(title || "").trim();

	if (!safeTitle) {
		return safeHtml;
	}

	const escapedTitle = safeTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const headingRegex = new RegExp(`^\\s*<h1[^>]*>\\s*${escapedTitle}\\s*</h1>\\s*`, "i");

	return safeHtml.replace(headingRegex, "");
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

router.use("/admin", adminRouter);

router.get("/", async function (req, res, next) {
	try {
		const baseUrl = res.locals.seo?.baseUrl || "";
		const subscribeStatus = String(req.query.subscribed || "")
			.trim()
			.toLowerCase();
		const subscribeMessage =
			subscribeStatus === "1"
				? "Subscription saved successfully."
				: subscribeStatus === "0"
					? "Please provide a valid name and email."
					: "";
		const recentPosts = await Post.find({}, { title: 1, slug: 1, category: 1, updatedAt: 1 })
			.sort({ updatedAt: -1 })
			.limit(6)
			.lean();

		const [jobPosts, resultPosts, admitCardPosts] = await Promise.all([
			Post.find({ category: "job" }, { title: 1, slug: 1, category: 1, updatedAt: 1 })
				.sort({ updatedAt: -1 })
				.limit(4)
				.lean(),
			Post.find({ category: "result" }, { title: 1, slug: 1, category: 1, updatedAt: 1 })
				.sort({ updatedAt: -1 })
				.limit(4)
				.lean(),
			Post.find({ category: "admit-card" }, { title: 1, slug: 1, category: 1, updatedAt: 1 })
				.sort({ updatedAt: -1 })
				.limit(4)
				.lean(),
		]);

		const categorySections = [
			{
				title: "Latest Jobs",
				category: "job",
				accent: "blue",
				items: jobPosts,
			},
			{
				title: "Results",
				category: "result",
				accent: "green",
				items: resultPosts,
			},
			{
				title: "Admit Card",
				category: "admit-card",
				accent: "orange",
				items: admitCardPosts,
			},
		];

		const homeMeta = {
			title: "Sarkari World | Latest Government Jobs, Results, Admit Cards",
			description:
				"Latest government jobs, results, admit cards, answer keys and syllabus updates in one place.",
			canonical: `${baseUrl}/`,
			ogType: "website",
		};

		const homeJsonLd = [
			{
				"@context": "https://schema.org",
				"@type": "WebSite",
				name: "Sarkari World",
				url: `${baseUrl}/`,
			},
			{
				"@context": "https://schema.org",
				"@type": "ItemList",
				name: "Latest Updates",
				itemListElement: recentPosts.map((post, index) => ({
					"@type": "ListItem",
					position: index + 1,
					url: `${baseUrl}/${post.slug}`,
					name: post.title,
				})),
			},
		];

		res.render("pages/home", {
			meta: homeMeta,
			seoJsonLd: homeJsonLd,
			year: new Date().getFullYear(),
			recentPosts,
			categorySections,
			subscribeStatus,
			subscribeMessage,
		});
	} catch (error) {
		return next(error);
	}
});

router.post("/subscribe", async function (req, res) {
	try {
		const name = sanitizeText(req.body?.name, 120);
		const email = sanitizeText(req.body?.email, 180).toLowerCase();
		const mobile = sanitizeMobile(req.body?.mobile);
		const city = sanitizeText(req.body?.city, 120);
		const state = sanitizeText(req.body?.state, 120);

		if (!name || !email || !isValidEmail(email)) {
			return res.redirect("/?subscribed=0");
		}

		await User.findOneAndUpdate(
			{ email },
			{
				$set: {
					name,
					email,
					mobile,
					city,
					state,
					is_active: true,
					subscribed_at: new Date(),
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);

		return res.redirect("/?subscribed=1");
	} catch (error) {
		return res.redirect("/?subscribed=0");
	}
});

router.get("/:category", async function (req, res, next) {
	try {
		const baseUrl = res.locals.seo?.baseUrl || "";
		const category = String(req.params.category || "")
			.trim()
			.toLowerCase();

		if (!ALLOWED_CATEGORIES.has(category)) {
			return next();
		}

		const pageParam = Number.parseInt(String(req.query.page || "1"), 10);
		const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
		const perPage = 20;
		const maxCap = 100;
		const skip = (page - 1) * perPage;

		if (skip >= maxCap) {
			return res.status(404).send("No more posts.");
		}

		const limit = Math.min(perPage, maxCap - skip);
		const posts = await Post.find(
			{ category },
			{ title: 1, slug: 1, description: 1, updatedAt: 1, category: 1 }
		)
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(limit + 1)
			.lean();

		const hasMore = posts.length > limit;
		const visiblePosts = hasMore ? posts.slice(0, limit) : posts;
		const categoryLabel = CATEGORY_LABELS[category] || category;
		const canonical = `${baseUrl}/${category}${page > 1 ? `?page=${page}` : ""}`;

		return res.render("pages/category", {
			meta: {
				title: `${categoryLabel} | Sarkari World`,
				description: `Browse ${categoryLabel.toLowerCase()} updates on Sarkari World.`,
				canonical,
				ogType: "website",
			},
			seoJsonLd: {
				"@context": "https://schema.org",
				"@type": "CollectionPage",
				name: `${categoryLabel} - Sarkari World`,
				url: canonical,
			},
			year: new Date().getFullYear(),
			category,
			categoryLabel,
			posts: visiblePosts,
			page,
			hasMore,
			nextPageUrl: hasMore ? `/${category}?page=${page + 1}` : "",
		});
	} catch (error) {
		return next(error);
	}
});

router.get("/post/:slug", async function (req, res, next) {
	try {
		const safeSlug = sanitizeSlug(req.params.slug);

		if (!safeSlug) {
			return res.status(400).send("Invalid slug.");
		}

		return res.redirect(301, "/" + safeSlug);
	} catch (error) {
		return next(error);
	}
});

router.get("/privacy-policy", (req, res) => {
	return renderPage(res, "pages/privacy-policy", {
		title: "Privacy Policy | Sarkari World",
		description: "Read how Sarkari World collects, uses, and protects user data.",
	});
});

router.get("/terms-and-conditions", (req, res) => {
	return renderPage(res, "pages/terms-and-conditions", {
		title: "Terms and Conditions | Sarkari World",
		description: "Read the terms and conditions for using Sarkari World.",
	});
});

router.get("/disclaimer", (req, res) => {
	return renderPage(res, "pages/disclaimer", {
		title: "Disclaimer | Sarkari World",
		description: "Understand the limitations and usage disclaimer of Sarkari World.",
	});
});

router.get("/about-us", (req, res) => {
	return renderPage(res, "pages/about-us", {
		title: "About Us | Sarkari World",
		description: "Learn about Sarkari World's mission, coverage, and values.",
	});
});

router.get("/contact-us", (req, res) => {
	return renderPage(res, "pages/contact-us", {
		title: "Contact Us | Sarkari World",
		description: "Contact Sarkari World for support and feedback.",
	});
});

router.get("/:slug", async function (req, res, next) {
	try {
		const baseUrl = res.locals.seo?.baseUrl || "";
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

		const safeContent = stripLeadingTitleH1(post.html_content || "", post.title || "");
		const postUrl = `${baseUrl}/${post.slug}`;
		const articleMeta = {
			title: `${post.title} | Sarkari World`,
			description: post.description || "Read full details on Sarkari World.",
			canonical: postUrl,
			ogType: "article",
			extraStylesheet: "/css/post-content.css",
			articlePublishedTime: post.published_at || post.createdAt,
			articleModifiedTime: post.updatedAt,
		};
		const articleJsonLd = {
			"@context": "https://schema.org",
			"@type": "Article",
			headline: post.title,
			description: post.description || "",
			articleSection: post.category || "general",
			url: postUrl,
			datePublished: post.published_at || post.createdAt,
			dateModified: post.updatedAt,
			mainEntityOfPage: postUrl,
			author: {
				"@type": "Organization",
				name: "Sarkari World",
			},
			publisher: {
				"@type": "Organization",
				name: "Sarkari World",
			},
		};

		return res.render("pages/post-detail", {
			meta: articleMeta,
			seoJsonLd: articleJsonLd,
			title: post.title + " preview",
			post,
			content: safeContent,
		});
	} catch (error) {
		return next(error);
	}
});

export default router;
