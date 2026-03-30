import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			maxlength: 120,
		},
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
			unique: true,
			index: true,
		},
		mobile: {
			type: String,
			trim: true,
			maxlength: 20,
		},
		city: {
			type: String,
			trim: true,
			maxlength: 120,
		},
		state: {
			type: String,
			trim: true,
			maxlength: 120,
		},
		subscribed_at: {
			type: Date,
			default: Date.now,
		},
		is_active: {
			type: Boolean,
			default: true,
			index: true,
		},
	},
	{
		timestamps: true,
	}
);

export default mongoose.model("User", userSchema);
