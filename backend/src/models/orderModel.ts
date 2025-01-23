import mongoose, {Document,Types, Schema} from "mongoose"

import { IObjectId, IProductRef } from "../types/modalTypes";

export interface IOrder extends Document {
  _id: Types.ObjectId;
  user: IObjectId;
  products: IProductRef[];
  totalPrice: number;
  totalCost?: number;
  paymentStatus: "Pending" | "Complete" | "Failed";
  deliveryStatus: "Pending" | "In-delivery" | "Delivered";
  reservedUntil: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        variant: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: [
          {
            quantity: {
              type: Number,
              required: true,
              min: [1, "Quantity must be at least 1"],
            },
            size: {
              type: String,
              required: true,
              enum: [
                "XXS",
                "XS",
                "S",
                "M",
                "L",
                "XL",
                "XXL",
                "XXXL",
                "One-Size",
              ],
            },
          },
        ],
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
        cost: {
          type: Number,
          min: [0, "Cost cannot be negative"],
          required: true,
        },
        units: {
          type: Number,
          min: [1, "Quantity must be at least 1"],
          required: true,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "totalPrice cannot be negative"],
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, "totalCost cannot be negative"],
    },
    deliveryStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "In-delivery", "Delivered"],
    },
    paymentStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Complete", "Failed"],
    },
    reservedUntil: { type: Date, required: true },
  },
  { timestamps: true }
);

orderSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.user
    delete ret.expiresAt
    delete ret.paymentStatus
    return ret
}});


export const OrderModel =mongoose.model<IOrder>("Order",orderSchema);
