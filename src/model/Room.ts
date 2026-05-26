import { Schema, model, Types } from "mongoose";
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
  },
  { timestamps: true }
);

export const Room = model("Room", roomSchema);
