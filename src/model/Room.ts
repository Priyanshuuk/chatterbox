import { Schema, model } from "mongoose";
import { User } from "@/model/User";
const roomSchema = new Schema(
  {
    code:{
      type: Number,
      required : true,
      unique : true,
    }
  },
  { timestamps: true }
);

export const Room = model("Room", roomSchema);
