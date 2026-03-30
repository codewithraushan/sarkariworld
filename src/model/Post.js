import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},
		description: {
			type: String,
			trim: true,
			required: true,
		},
		slug: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},

		category: {
			type: String,
			enum: [
				"job",
				"result",
				"admit-card",
				"answer-key",
				"syllabus",
				"admission",
				"important",
			],
			required: true,
			index: true,
		},

		tags: [
			{
				type: String,
				index: true,
			},
		],

		html_content: {
			type: String,
			required: true,
		},

		text_content: {
			type: String,
		},

		status: {
			type: String,
			enum: ["saved", "published"],
			default: "saved",
			index: true,
		},

		views: {
			type: Number,
			default: 0,
		},

		published_at: {
			type: Date,
			default: Date.now,
			index: true,
		},
	},
	{
		timestamps: true,
	}
);

export default mongoose.model("Post", postSchema);
