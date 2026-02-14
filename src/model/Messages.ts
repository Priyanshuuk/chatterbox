import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export const Message = model("Message", messageSchema);
