import express from "express";
import db from "../db/index.js";
import logger from "../utils/logger.js";

const homeController = () => {
	const recentPosts = db.posts.findRecent(10);
};

const subscribeController = (req, res, next) => {};

const categoryController = (req, res, next) => {};

const siteMapController = (req, res, next) => {};

const getSlugController = (req, res, next) => {
	const { slug } = req.params;
};
