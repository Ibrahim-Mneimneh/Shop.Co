import mongoose, { Document, Types } from "mongoose";
import { IObjectId } from "../../types/modalTypes";
import { Schema } from "mongoose";

export interface IReview{
  user:IObjectId,
  review:string,
  createdAt:Date
}

export interface IRating extends Document {
  _id: Types.ObjectId;
  product: IObjectId;
  rating: number;
  totalReviews:number;
  reviews:IReview[];
}

const productRatingSchema = new Schema<IRating>({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true,
  },
  rating: { type: Number, default: 0.0, min: 0.0, max: 5.0 },
  totalReviews: { type: Number, default: 0, min:0 },
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique:true,
      },
      review: {
        type: String,
        required: true,
      },
      rating:{ type: Number, default: 0.0, min: 0.0, max: 5.0 },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
});

export const RatingModel = mongoose.model("Rating", productRatingSchema);