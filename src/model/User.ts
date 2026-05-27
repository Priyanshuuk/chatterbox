import { Schema, model, Types, models } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    friendCode: {
      type: String,
      unique: true,
      default: "",
    },
    friends: [{
      type: Types.ObjectId,
      ref: "User",
    }],
  },
  { timestamps: true }
);

userSchema.pre("save", function () {
  if (this.isNew && !this.friendCode) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    this.friendCode = code;
  }
});

export const User = models.User || model("User", userSchema);
