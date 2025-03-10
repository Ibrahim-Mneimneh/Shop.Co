import { NextFunction, Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  deleteProductReviewSchema,
  reviewProductSchema,
  updateProductReviewSchema,
} from "../../types/userControllerTypes";
import { HttpError } from "../../utils/customErrors";
import { UserModel } from "../../models/userModel";
import { ProductVariantModel } from "../../models/product/productVariantModel";
import { OrderModel } from "../../models/orderModel";
import { RatingModel } from "../../models/product/ratingModel";
import { DbSessionRequest } from "../../middleware/sessionMiddleware";
import { ProductModel } from "../../models/product/productModel";

// Rate a product (after purchase)
export const reviewProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // get the userId from token / orderId & variantId / rating through the body
    const { userId } = req;
    const { error, value } = reviewProductSchema.validate({
      variantId: req.params.variantId,
      orderId: req.params.orderId,
      review: req.body.review,
      rating: req.body.rating,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { orderId, variantId, review, rating } = value;
    // Get user's name
    const userData = await UserModel.findById(userId, "name");
    if (!userData) {
      throw new HttpError("User not available", 404);
    }
    // Check variant, ensure its active
    const isActive = await ProductVariantModel.findOne(
      {
        _id: variantId,
        status: "Active",
      },
      "product"
    );

    if (!isActive) {
      throw new HttpError("Product not found", 404);
    }
    // Fetch the order ensure the variantId is included & the isRated is false
    const orderedProduct = await OrderModel.find({
      _id: orderId,
      products: { $elemMatch: { variant: variantId, isRated: false } },
    });

    if (!orderedProduct) {
      res
        .status(404)
        .json({ message: "Order doesn't contain the selected product" });
      return;
    }
    const { product } = isActive;
    const hasReviewed = await RatingModel.exists({
      product,
      reviews: { $elemMatch: { user: userId } },
    });

    if (hasReviewed) {
      throw new HttpError("Product already reviewed", 400);
    }
    const ratingData = await RatingModel.findOne({ product }, "-reviews");
    if (!ratingData) {
      throw new HttpError("Product review unavailable", 404);
    }
    const { _id, rating: oldRating, totalReviews, __v } = ratingData;
    const newRating = (totalReviews * oldRating + rating) / (totalReviews + 1);
    // update totalReviews, rating and add review
    const updatedRating = await RatingModel.findOneAndUpdate(
      { _id, __v },
      {
        $push: {
          reviews: {
            user: userId,
            name: userData.name,
            rating,
            review,
          },
        },
        $inc: { totalReviews: 1 },
        $set: { rating: newRating },
      },
      { new: true, projection: "-reviews" }
    );
    if (!updatedRating) {
      throw new HttpError("Product review failed", 400);
    }
    res.status(200).json({ message: "Review sent successfully" });
  } catch (error: any) {
    return next(error);
  }
};

export const updateProductReview = async (
  req: DbSessionRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = req.dbSession;
    const { userId } = req;
    const { error, value } = updateProductReviewSchema.validate({
      variantId: req.params.variantId,
      reviewId: req.params.reviewId,
      review: req.body.review,
      rating: req.body.rating,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { variantId, reviewId, review, rating } = value;
    const variantData = await ProductVariantModel.findOne(
      { _id: variantId, status: "Active" },
      "product"
    );
    if (!variantData) {
      throw new HttpError("Product not available", 404);
    }
    const ratingData = await RatingModel.findOne({
      product: variantData.product,
      reviews: { $elemMatch: { user: userId, _id: reviewId } },
    }).select({
      __v: 1,
      rating: 1,
      totalReviews: 1,
      reviews: { $elemMatch: { user: userId } },
    });
    if (!ratingData) {
      throw new HttpError("Review not found", 404);
    }
    const { reviews, __v, totalReviews, rating: oldAverRating } = ratingData;
    const oldRating = reviews[0].rating;
    const newRating =
      (oldAverRating * totalReviews - oldRating + rating) / totalReviews;
    // update review
    const updatedRating = await RatingModel.findOneAndUpdate(
      {
        product: variantData.product,
        "reviews._id": reviewId,
        __v,
      },
      {
        $set: {
          "reviews.$.rating": rating,
          "reviews.$.review": review,
          rating: newRating,
        },
      },
      { new: true, projection: { _id: 1, rating: 1, totalReviews: 1 }, session }
    );
    if (!updatedRating) {
      throw new HttpError("Failed to update review", 400);
    }
    const updateVariant = await ProductModel.updateOne(
      {
        _id: variantData.product,
        status: "Active",
      },
      {
        rating: updatedRating.rating,
        totalReviews: updatedRating.totalReviews,
      },
      { session }
    );
    if (updateVariant.modifiedCount === 0) {
      throw new HttpError(
        "Failed to update review. Product is in-active at the time",
        400
      );
    }
    res.status(200).json({ message: "Review updated sucessfully" });
  } catch (error: any) {
    return next(error);
  }
};

export const deleteProductReview = async (
  req: DbSessionRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = req.dbSession;
    const { userId } = req;
    const { error, value } = deleteProductReviewSchema.validate({
      variantId: req.params.variantId,
      reviewId: req.params.reviewId,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { variantId, reviewId } = value;
    const variantData = await ProductVariantModel.findOne(
      { _id: variantId, status: "Active" },
      "product"
    );
    if (!variantData) {
      throw new HttpError("Product not available", 404);
    }
    // get the old rating and calculate the new rating
    const ratingData = await RatingModel.findOne({
      product: variantData.product,
      reviews: { $elemMatch: { user: userId, _id: reviewId } },
    }).select({
      __v: 1,
      rating: 1,
      totalReviews: 1,
      reviews: { $elemMatch: { user: userId } },
    });
    if (!ratingData) {
      throw new HttpError("Review not found", 404);
    }
    const { reviews, __v, totalReviews, rating: oldAverRating } = ratingData;
    const userRating = reviews[0].rating;
    const newRating =
      (oldAverRating * totalReviews - userRating) / (totalReviews - 1);
    const updatedRating = await RatingModel.findOneAndUpdate(
      { product: variantData.product, __v },
      {
        $pull: { reviews: { user: userId, _id: reviewId } },
        $inc: { totalReviews: -1 },
        rating: newRating,
      },
      { new: true, session, projection: { _id: 1, rating: 1, totalReviews: 1 } }
    );
    if (!updatedRating) {
      throw new HttpError("Failed to delete review", 400);
    }
    const updateVariant = await ProductModel.updateOne(
      {
        _id: variantData.product,
        status: "Active",
      },
      {
        rating: updatedRating.rating,
        totalReviews: updatedRating.totalReviews,
      },
      { session }
    );
    if (updateVariant.modifiedCount === 0) {
      throw new HttpError(
        "Failed to delete review. Product is in-active at the time",
        400
      );
    }
    res.status(200).json({ message: "Review deleted sucessfully" });
  } catch (error: any) {
    return next(error);
  }
};
