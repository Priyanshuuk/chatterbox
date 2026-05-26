import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema(
  {
    content: {
      type: String,
      default: "",
    },
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: Types.ObjectId,
      ref: "Room",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "audio"],
      default: "text",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    readBy: [{
      type: Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true }
);

export const Message = model("Message", messageSchema);
