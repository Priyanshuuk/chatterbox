import { Schema, model, Types, models } from "mongoose";
const roomSchema = new Schema(
  {
    code:{
      type: String,
      required : true,
      unique : true,
    },
    participants: [{
      type: Types.ObjectId,
      ref: "User",
    }],
    type: {
      type: String,
      enum: ["group", "dm"],
      default: "group",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    maxParticipants: {
      type: Number,
      default: null,
    },
    creator: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const Room = models.Room || model("Room", roomSchema);
