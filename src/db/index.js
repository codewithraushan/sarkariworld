import prisma from "../utils/prisma.js";
import logger from "../utils/logger.js";

function withPublicId(entity) {
	if (!entity) {
		return entity;
	}

	return {
		...entity,
		_id: entity.id,
	};
}

function withPublicIds(items) {
	return Array.isArray(items) ? items.map(withPublicId) : [];
}

const posts = {
	async findAllForAdmin() {
		const items = await prisma.post.findMany({
			select: {
				id: true,
				title: true,
				slug: true,
				category: true,
				author_name: true,
				published_at: true,
			},
			orderBy: { published_at: "desc" },
		});

		return withPublicIds(items);
	},

	async findRecent(limit = 6) {
		const items = await prisma.post.findMany({
			select: { id: true, title: true, slug: true, category: true, published_at: true },
			orderBy: { published_at: "desc" },
			take: limit,
		});

		return withPublicIds(items);
	},

	async findRecentByCategory(category, limit = 4) {
		const items = await prisma.post.findMany({
			where: { category },
			select: { id: true, title: true, slug: true, category: true, published_at: true },
			orderBy: { published_at: "desc" },
			take: limit,
		});

		return withPublicIds(items);
	},

	async findCategoryPage(category, skip, takeWithBuffer) {
		const items = await prisma.post.findMany({
			where: { category },
			select: {
				id: true,
				title: true,
				slug: true,
				description: true,
				published_at: true,
				category: true,
			},
			orderBy: { published_at: "desc" },
			skip,
			take: takeWithBuffer,
		});

		return withPublicIds(items);
	},

	async findBySlug(slug) {
		const item = await prisma.post.findUnique({ where: { slug } });
		return withPublicId(item);
	},

	async slugExists(slug, excludeId = "") {
		const existing = await prisma.post.findFirst({
			where: excludeId
				? {
						slug,
						NOT: { id: excludeId },
					}
				: { slug },
			select: { id: true },
		});

		return Boolean(existing);
	},

	async updateById(postId, payload) {
		try {
			const updated = await prisma.post.update({
				where: { id: postId },
				data: payload,
			});

			return withPublicId(updated);
		} catch (error) {
			if (error?.code === "P2025") {
				return null;
			}

			throw error;
		}
	},

	async create(payload) {
		const created = await prisma.post.create({ data: payload });
		return withPublicId(created);
	},

	async deleteBySlug(slug) {
		try {
			await prisma.post.delete({ where: { slug } });
		} catch (error) {
			if (error?.code !== "P2025") {
				throw error;
			}
		}
	},

	async findBySlugAndIncrementViews(slug) {
		try {
			const updated = await prisma.post.update({
				where: { slug },
				data: { views: { increment: 1 } },
			});

			return withPublicId(updated);
		} catch (error) {
			if (error?.code === "P2025") {
				return null;
			}

			throw error;
		}
	},

	async findAllForSitemap() {
		const items = await prisma.post.findMany({
			select: { slug: true, published_at: true, updatedAt: true },
			orderBy: { published_at: "desc" },
		});

		return items;
	},
};

const users = {
	async findForAdmin({ query = "", city = "", state = "", limit = 500 } = {}) {
		const where = {};

		if (city) {
			where.city = { equals: city, mode: "insensitive" };
		}

		if (state) {
			where.state = { equals: state, mode: "insensitive" };
		}

		if (query) {
			where.OR = [
				{ name: { contains: query, mode: "insensitive" } },
				{ email: { contains: query, mode: "insensitive" } },
			];
		}

		const items = await prisma.user.findMany({
			where,
			select: {
				id: true,
				name: true,
				email: true,
				mobile: true,
				city: true,
				state: true,
				subscribed_at: true,
				updatedAt: true,
				createdAt: true,
			},
			orderBy: [{ subscribed_at: "desc" }, { createdAt: "desc" }],
			take: limit,
		});

		return withPublicIds(items);
	},

	async create(payload) {
		const created = await prisma.user.create({ data: payload });
		return withPublicId(created);
	},

	async findById(userId) {
		const item = await prisma.user.findUnique({ where: { id: userId } });
		return withPublicId(item);
	},

	async emailExists(email, excludeId = "") {
		const existing = await prisma.user.findFirst({
			where: excludeId
				? {
						email,
						NOT: { id: excludeId },
					}
				: { email },
			select: { id: true },
		});

		return Boolean(existing);
	},

	async updateById(userId, payload) {
		const updated = await prisma.user.update({
			where: { id: userId },
			data: payload,
		});

		return withPublicId(updated);
	},

	async deleteById(userId) {
		try {
			await prisma.user.delete({ where: { id: userId } });
		} catch (error) {
			if (error?.code !== "P2025") {
				throw error;
			}
		}
	},

	async upsertByEmail(email, payload) {
		const upserted = await prisma.user.upsert({
			where: { email },
			create: {
				...payload,
				email,
			},
			update: payload,
		});

		return withPublicId(upserted);
	},
};

const admins = {
	async count() {
		return prisma.adminUser.count();
	},

	async findByUserId(userId) {
		const item = await prisma.adminUser.findUnique({ where: { user_id: userId } });
		return withPublicId(item);
	},

	async create(payload) {
		const created = await prisma.adminUser.create({ data: payload });
		return withPublicId(created);
	},

	async updatePasswordById(adminId, password) {
		const updated = await prisma.adminUser.update({
			where: { id: adminId },
			data: { password },
		});

		return withPublicId(updated);
	},
};

const logs = {
	async create(payload = {}) {
		try {
			if (!prisma.activityLog || typeof prisma.activityLog.create !== "function") {
				return null;
			}

			return await prisma.activityLog.create({
				data: {
					level: String(payload.level || "info").toLowerCase(),
					action: String(payload.action || "unknown_action").slice(0, 120),
					entity: payload.entity ? String(payload.entity).slice(0, 120) : null,
					entity_id: payload.entity_id ? String(payload.entity_id).slice(0, 120) : null,
					actor_id: payload.actor_id ? String(payload.actor_id).slice(0, 120) : null,
					actor: payload.actor ? String(payload.actor).slice(0, 160) : null,
					message: payload.message ? String(payload.message).slice(0, 500) : null,
					ip: payload.ip ? String(payload.ip).slice(0, 100) : null,
					userAgent: payload.userAgent ? String(payload.userAgent).slice(0, 300) : null,
					meta:
						payload.meta &&
						typeof payload.meta === "object" &&
						!Array.isArray(payload.meta)
							? payload.meta
							: null,
				},
			});
		} catch (error) {
			logger.warn("Failed to persist activity log", {
				error: error?.message || String(error),
				action: payload?.action || "unknown_action",
			});
			return null;
		}
	},
};

export function isUniqueConstraintError(error) {
	return Boolean(error && error.code === "P2002");
}

export default {
	admins,
	logs,
	posts,
	users,
};
