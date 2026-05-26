import { Schema, model, Types } from "mongoose";

const friendRequestSchema = new Schema(
  {
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const FriendRequest = model("FriendRequest", friendRequestSchema);
