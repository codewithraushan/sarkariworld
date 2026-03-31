export const getAdminController = (req, res, next) => {
	return res.render("pages/admin", {
		meta: {
			title: "Admin Dashboard",
			description: "Admin actions for creating and viewing posts.",
		},
		year: new Date().getFullYear(),
	});
};
