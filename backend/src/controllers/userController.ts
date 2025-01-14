import { Request, Response, RequestHandler } from "express";
import Joi from "joi";
import bcrypt from "bcryptjs";
import clc from "cli-color";

import { UserModel } from "../models/userModel";
import { emailVerification } from "./verificationController";
import { CartModel, ICart } from "../models/cartModel";
import { jwtGenerator } from "./authController";

import { AuthRequest } from "../middleware/authMiddleware";
import { ClientSession, IObjectId, IProductRef } from "../types/modalTypes";
import { DbSessionRequest } from "../middleware/sessionMiddleware";
import { ProductVariantModel } from "../models/product/productVariantModel";
import { OrderModel } from "../models/orderModel";
import mongoose from "mongoose";

export interface IRegister {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  country: string;
  postalCode: number;
  bldngNum: number;
}
export interface ILogin {
  email: string;
  password: string;
}

const registerSchema = Joi.object<IRegister>({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),
  firstname: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .max(15)
    .required()
    .messages({
      "string.regex": "First name should only contain letters and spaces",
      "string.max": "First name should not exceed 15 characters",
      "any.required": "First name is required",
    }),
  lastname: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .max(15)
    .required()
    .messages({
      "string.regex": "Last name should only contain letters and spaces",
      "string.max": "Last name should not exceed 15 characters",
      "any.required": "Last name is required",
    }),
  country: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "any.required": "Country is required",
    }),
  postalCode: Joi.number().required().messages({
    "any.required": "Postal code is required",
  }),
  bldngNum: Joi.number().required().messages({
    "any.required": "Building number is required",
  }),
});
export const loginSchema = Joi.object<ILogin>({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),
});

export const registerUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { error, value } = registerSchema.validate(req.body);

    // If the data is invalid
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
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
      res.status(400).json({ message: "Email already in use" });
      return;
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
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
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }

    // check if the user is available
    const user = await UserModel.findOne({ email: value.email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    // check if the user is verified
    if (!user.isVerified) {
      if (
        user.verificationTokenExpiresAt &&
        new Date(user.verificationTokenExpiresAt) < new Date()
      ) {
        emailVerification(user, user.email, user.name.split(" ")[0]);
        res.status(403).json({
          message:
            "Your verification token has expired. Please check your email for a new verification link.",
        });
        return;
      } else {
        res.status(403).json({
          message:
            "Your account is not verified. Please check your email to verify your account.",
        });
        return;
      }
    }
    // get password unhash it and check if the password is true
    const match = await bcrypt.compare(value.password, user.password);

    if (!match) {
      res.status(400).json({ message: "Incorrect email/password" });
      return;
    }
    // generate the user token (JWT)
    const token: string = jwtGenerator(
      user._id as IObjectId,
      user.passwordChangedAt ? user.passwordChangedAt.toISOString() : "",
      user.cart as IObjectId
    );

    res.status(200).json({ message: "Login Successful", data: user, token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const userData = await UserModel.findById(userId);
    if (!userData) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ message: "Successful", data: userData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
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
      res.status(402).json({ message: "Cart not available" });
      return;
    }
    if (cartData.products.length === 0) {
      res.status(400).json({ message: "Cart is empty" });
      return;
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
    const { products, totalPrice, totalCost, reqproducts } = order;
    // Add allocated elements to the cart
    const orderData = await OrderModel.create({
      user: userId,
      products,
      totalPrice,
      totalCost,
      reservedUntil: new Date(Date.now() + paymentTimeout)
    });

    if (!orderData) {
      res.status(400).json({
        message: `Order failed: ${errorMessage}`,
        data: order,
      });
      return;
    }

    // In the cron make sure to restock items before activating the delete index
    // Empty the cart if successful & add unitsSold
    // Make a route for now to change the status of payment for testing **
    // add cron to handle timeout in case of down time (paymentStatus/date)
    
    res
      .status(200)
      .json({ message: "Order has been successfully placed", data: order });

    const orderId = orderData._id;
    setTimeout(async () => {
      // console.log(clc.green("Order timeout processing..."));
      // Add new session
      const session2 = await mongoose.startSession();
      session2.startTransaction();
      let transactionFlag = false;
      try {
        const orderData = await OrderModel.findByIdAndUpdate(
          orderId,
          { paymentStatus: "Failed" },
          { session: session2 }
        );
        if (!orderData) {
          throw new Error("Failed to find order -- Timeout failed");
        }
        if (orderData.paymentStatus === "Pending") {
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
                { session: session2 }
              );
              if (updateVariantDetails.modifiedCount !== restockOps.length) {
                throw new Error("Stock partially updated -- Update reverted");
              }
              const deletedOrder = await OrderModel.findByIdAndDelete(orderId,{session:session2})
              if(!deletedOrder){
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

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
// Get orders

// Get order

// ? Contact Support

// ? Send complain or return request

// Update profile details

// Get feed
