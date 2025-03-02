import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import clc from "cli-color";

import { UserModel } from "../../models/userModel";
import { emailVerification } from "./verification/emailSender";
import { CartModel, ICart } from "../../models/cartModel";

import { AuthRequest } from "../../middleware/authMiddleware";
import { ClientSession, IObjectId } from "../../types/modalTypes";
import { DbSessionRequest } from "../../middleware/sessionMiddleware";
import { ProductVariantModel } from "../../models/product/productVariantModel";
import { OrderModel } from "../../models/orderModel";
import mongoose from "mongoose";
import {
  getOrdersSchema,
  loginSchema,
  orderIdSchema,
  registerSchema,
  reviewProductSchema,
} from "../../types/userControllerTypes";
import { jwtGenerator } from "../../utils/jwtGenerator";
import { RatingModel } from "../../models/product/ratingModel";
import { IProduct } from "../../models/product/productModel";
import { HttpError } from "../../utils/customErrors";

export const registerUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { error, value } = registerSchema.validate(req.body);

    // If the data is invalid
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    // Reformat data
    let data = {
      name: value.firstname + " " + value.lastname,
      address: `${value.country},${value.postalCode},${value.bldngNum}`,
      email: value.email,
      password: value.password,
    };

    // Check if the email is used
    const usedEmail = await UserModel.findOne({ email: data.email });
    if (usedEmail) {
      throw new HttpError("Email already in use", 400);
    }
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    data.password = hashedPassword;

    const user = await UserModel.create(data);

    // Send email verification
    emailVerification(user, value.email, value.firstname);

    // Create a cart for this user
    const { _id }: ICart = await CartModel.create({ user: user._id });

    user.cart = _id;
    await user.save();

    // send the data back with the token
    res.status(201).json({ message: "User registered Successfully" });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

export const loginUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    // I need to require the data from the user
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }

    // check if the user is available
    const user = await UserModel.findOne({ email: value.email });
    if (!user) {
      throw new HttpError("User not found", 404);
    }
    // check if the user is verified
    if (!user.isVerified) {
      if (
        user.verificationTokenExpiresAt &&
        new Date(user.verificationTokenExpiresAt) < new Date()
      ) {
        emailVerification(user, user.email, user.name.split(" ")[0]);
        throw new HttpError(
          "Your verification token has expired. Please check your email for a new verification link.",
          403
        );
      } else {
        throw new HttpError(
          "Your account is not verified. Please check your email to verify your account.",
          400
        );
      }
    }
    // get password unhash it and check if the password is true
    const match = await bcrypt.compare(value.password, user.password);

    if (!match) {
      throw new HttpError("Incorrect email/password", 400);
    }
    // generate the user token (JWT)
    const token: string = jwtGenerator(
      user._id as IObjectId,
      user.passwordChangedAt ? user.passwordChangedAt.toISOString() : "",
      user.cart as IObjectId
    );

    res.status(200).json({ message: "Login Successful", data: user, token });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userData = await UserModel.findById(userId);
    if (!userData) {
      throw new HttpError("User not found", 404);
    }
    res.status(200).json({ message: "Successful", data: userData });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

// Make an order
export const orderProduct = async (req: DbSessionRequest, res: Response) => {
  try {
    const paymentTimeout: number = 8 * 60 * 1000; // 5 mins
    const cartId = req.cartId;
    const userId = req.userId;
    const session = req.dbSession as ClientSession;
    // get the cart & verify its not empty
    const cartData = await CartModel.findById(cartId);
    if (!cartData) {
      throw new HttpError("Cart not available", 404);
    }
    if (cartData.products.length === 0) {
      throw new HttpError("Cart is empty! Add elements to cart", 400);
    }
    const cartObj = cartData.toObject();
    // Allocate the items in the cart (check if available)
    const { success, errorMessage, order } =
      await ProductVariantModel.updateQuantity(
        "purchase",
        cartObj.products,
        session
      );
    if (!success || !order) {
      res.status(400).json({
        message: `Order failed: ${errorMessage}`,
        data: order,
      });
      return;
    }
    const { products, totalPrice, totalCost, purchaseErrors } = order;
    // Add allocated elements to the cart
    const orderData = await OrderModel.create(
      [
        {
          user: userId,
          products,
          totalPrice,
          totalCost,
          reservedUntil: new Date(Date.now() + paymentTimeout),
        },
      ],
      { session }
    );

    if (!orderData) {
      res.status(400).json({
        message: `Order failed: ${errorMessage}`,
        data: order,
      });
      return;
    }
    // Combine the error & order (exclude cost, totalCost and units)
    const filteredOrder = [...purchaseErrors];
    products.forEach((product) => {
      const quantityLength = product.quantity.length;
      // delete units and cost
      delete product.cost;
      delete product.units;
      for (let i = 0; i < quantityLength; i++) {
        const elemQuantity = product.quantity[i];
        filteredOrder.push({ ...product, quantity: [elemQuantity] });
      }
    });
    const orderId = orderData[0]._id;
    res.status(200).json({
      message: "Order has been successfully placed",
      data: { _id: orderId, products: filteredOrder, totalPrice },
    });

    setTimeout(async () => {
      // console.log(clc.green("Order timeout processing..."));
      // Add new session
      const session2 = await mongoose.startSession();
      session2.startTransaction();
      let transactionFlag = false;
      try {
        const orderData = await OrderModel.findOneAndUpdate(
          {
            _id: orderId,
            paymentStatus: "Pending",
          },
          { paymentStatus: "Failed" },
          { session: session2 }
        );
        // If payment already complete (orderData empty --> no operation)
        if (orderData && orderData.paymentStatus === "Pending") {
          const orderProducts = orderData.products;
          // Add restockOperations
          const restockOps = [];

          for (const product of orderProducts) {
            const variantId = product.variant;
            const variantQuantities = product.quantity;

            for (const elemQuantity of variantQuantities) {
              const { quantity, size } = elemQuantity;
              restockOps.push({
                updateOne: {
                  filter: { _id: variantId },
                  update: {
                    $inc: { "quantity.$[elem].quantityLeft": quantity },
                  },
                  arrayFilters: [{ "elem.size": size }],
                },
              });
              const updateVariantDetails = await ProductVariantModel.bulkWrite(
                restockOps,
                {
                  session: session2,
                }
              );
              if (updateVariantDetails.modifiedCount !== restockOps.length) {
                throw new Error("Stock partially updated -- Update reverted");
              }
              const deletedOrder = await OrderModel.findByIdAndDelete(orderId, {
                session: session2,
              });
              if (!deletedOrder) {
                throw new Error("Failed to delete order -- Update reverted");
              }
              transactionFlag = true;
            }
          }
        }

        await session2.commitTransaction();
        session2.endSession();
      } catch (error: any) {
        if (!transactionFlag) {
          /*console.log(
            clc.redBright("Order timeout processing failed..." + error.message)
          );*/
          await session2.abortTransaction();
          session2.endSession();
        }
      }
    }, paymentTimeout);
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

// Payment request (for testing purpose for now, later use stripe)
export const confirmPayment = async (req: DbSessionRequest, res: Response) => {
  try {
    const userId = req.userId as IObjectId;
    const session = req.dbSession;
    const cartId = req.cartId as IObjectId;
    const { error, value } = orderIdSchema.validate(req.body);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const orderId = value.orderId;
    // Change the paymentStatus to "Complete"
    const orderData = await OrderModel.findById(orderId);
    if (!orderData) {
      throw new HttpError("Order not found", 404);
    }
    if (
      orderData.paymentStatus !== "Pending" ||
      orderData.user.toString() !== userId.toString()
    ) {
      const message =
        orderData.paymentStatus !== "Pending"
          ? "Order payment already confirmed"
          : "Order not found";
      throw new HttpError(message, 404);
    }
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      { paymentStatus: "Complete" },
      { session, new: true }
    );
    if (!updatedOrder) {
      throw new HttpError("Order not found", 404);
    }
    // Add orderId to user
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { orders: orderId } },
      { session, new: true }
    );
    // Empty the cart
    const updatedCart = await CartModel.findByIdAndUpdate(
      cartId,
      { $set: { products: [] } },
      { session, new: true }
    );
    // Update unitsSold in the variant
    const unitsSoldOps = updatedOrder.products.map((product) => {
      return {
        updateOne: {
          filter: { _id: product.variant },
          update: { $inc: { unitsSold: product.units } },
        },
      };
    });
    const updateVariantDetails = await ProductVariantModel.bulkWrite(
      unitsSoldOps,
      { session }
    );
    if (updateVariantDetails.modifiedCount !== unitsSoldOps.length) {
      res
        .status(400)
        .json({ message: "Try again later! Failed to confirm payment" });
    }
    res.status(200).json({ message: "Order payment succeeded" });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

// Get orders (with pagination)
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { error, value } = getOrdersSchema.validate(req.query);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const userData = await UserModel.findById(userId, "orders");
    if (!userData) {
      throw new Error("User data not available");
    }
    const { orders } = userData;
    const { page, limit } = value;
    const totalPages = Math.floor((orders.length - 1) / limit) + 1;
    if (orders.length === 0) {
      throw new HttpError("No orders found", 404);
    }
    if (page > totalPages) {
      throw new HttpError(
        "Validation failed: requested page exceeds totalPages: " + totalPages,
        400
      );
    }
    const skip = (page - 1) * limit;
    const selectedOrders = orders.slice(skip, skip + limit).reverse();
    // Fetch orders & include needed data (link them with the product and productVar)
    const ordersData = await OrderModel.find(
      { _id: { $in: selectedOrders } },
      "_id totalPrice deliveryStatus createdAt"
    );

    res.status(200).json({
      message: "Orders loaded successfully",
      data: { orders: ordersData, page, totalPages },
    });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};
// Get order
export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req;
    const { error, value } = orderIdSchema.validate(req.params);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { orderId } = value;
    // Check if the user has such an Id (include in the find)
    const orderData = await OrderModel.findOne(
      { _id: orderId, user: userId },
      {
        updatedAt: 0,
        totalCost: 0,
        "products.cost": 0,
        "products.units": 0,
        reservedUntil: 0,
      }
    );
    if (!orderData) {
      throw new HttpError("Order not found", 404);
    }
    res
      .status(200)
      .json({ message: "Order loaded successfully", data: orderData });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};
// Rate a product (after purchase)
export const reviewProduct = async (req: AuthRequest, res: Response) => {
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
    throw new HttpError(error.message, 500);
  }
};

// ? Contact Support

// ? Send complain or return request

// Update profile details

// Get feed
