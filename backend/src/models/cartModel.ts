import mongoose, { Document, Types, Schema } from "mongoose";

import { IOrderQuantity, IProductRef } from "../types/modalTypes";
import { ProductVariantModel } from "./product/productVariantModel";

export interface ICart extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  products: IProductRef[];
  getTotalPrice(): Promise<number>;
}

const cartSchema = new Schema<ICart>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: [
    {
      variant: {
        type: Schema.Types.ObjectId,
        ref: "ProductVariant",
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
            enum: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "One-Size"],
          },
        },
      ],
    },
  ],
});

cartSchema.methods.getTotalPrice=async function ():Promise<number> {
  const products = this.products;
  try {
    let totalPrice: number = 0;
    await this.populate({
      path: 'products.variant',
      select: 'isOnSale originalPrice saleOptions',
    })
    for (let i = 0; i < products.length; i++) {
      const productData = products[i].variant;
      if (!productData) {
        throw new Error("Product not found");
      }
      const price: number = productData.isOnSale
        ? productData.saleOptions?.salePrice ?? productData.originalPrice
        : productData.originalPrice;
      let units = 0;
      products[i].quantity.forEach((elemQuantity:IOrderQuantity) => {
        units += elemQuantity.quantity;
      });
      totalPrice += price * units;
    }
    return parseFloat(totalPrice.toFixed(2));
  } catch (error) {
    console.log(`Virtual totalPrice calculation error: ${error}`);
    return 0
  }
};

cartSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.user;
    return;
  },
});

export const CartModel = mongoose.model<ICart>("Cart", cartSchema);
