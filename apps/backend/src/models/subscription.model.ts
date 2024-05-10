import mongoose, { Schema, Types } from "mongoose";
import { User } from "./user.model";

export interface ISubscription {
  subscribers: Types.ObjectId;
  channel: Types.ObjectId;
}

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Types.ObjectId,
      ref: "User",
    },
    channel: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
