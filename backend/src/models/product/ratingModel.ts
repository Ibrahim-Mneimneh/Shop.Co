import mongoose, { Document, Types } from "mongoose";
import { IObjectId } from "../../types/modalTypes";
import { Schema } from "mongoose";

export interface IReview {
  user: IObjectId;
  review: string;
  rating: number;
  name:string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRating extends Document {
  _id: Types.ObjectId;
  product: IObjectId;
  rating: number;
  totalReviews: number;
  reviews: IReview[];
}

const productRatingSchema = new Schema<IRating>({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true,
  },
  rating: { type: Number, default: 0.0, min: 0.0, max: 5.0 },
  totalReviews: { type: Number, default: 0, min: 0 },
  reviews: [
    new mongoose.Schema(
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
          unique: true,
        },
        name:{
          type:String,
          required:true,
        },
        review: {
          type: String,
          required: true,
        },
        rating: { type: Number, default: 0.0, min: 0.0, max: 5.0 },
      },
      { timestamps: true }
    ),
  ],
});

productRatingSchema.index({ product: 1 });

export const RatingModel = mongoose.model("Rating", productRatingSchema);
