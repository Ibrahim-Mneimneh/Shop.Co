import { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";

import { UserModel } from "../../models/userModel";
import { IObjectId } from "../../types/modalTypes";
import { AuthRequest } from "../../middleware/authMiddleware";

import { ProductModel } from "../../models/product/productModel";
import { updateDeliveryStatusSchema } from "../../types/productTypes";
import { productIdSchema } from "../../types/publicControllerTypes";
import { loginSchema } from "../../types/userControllerTypes";
import { OrderModel } from "../../models/orderModel";
import { jwtGenerator } from "../../utils/jwtGenerator";
import { isMoreThanWeekOld } from "../../utils/isValidFunctions";
import { HttpError } from "../../utils/customErrors";

// Admin login
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }

    const user = await UserModel.findOne({ email: value.email });
    if (!user) {
      throw new HttpError("User not found", 404);
    }

    const match = await bcrypt.compare(value.password, user.password);

    if (!match) {
      throw new HttpError("Incorrect email/password", 401);
    }

    // generate the user token (JWT)
    const token: string = jwtGenerator(
      user._id as IObjectId,
      user.passwordChangedAt ? user.passwordChangedAt.toISOString() : "",
      undefined,
      user.role
    );

    res.status(200).json({ message: "Login Successful", data: user, token });
  } catch (error: any) {
    return next(error);
  }
};

// View product & its variants
export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // get id from params
    const { error, value } = productIdSchema.validate({
      productId: req.params.productId,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    // fetch for the product & variants
    const productDetails = await ProductModel.getVariants(
      value.productId,
      "Active",
      { status: "Active" }
    );
    if (productDetails.success && productDetails.product) {
      const product = productDetails.product;
      res.status(200).json({
        message: "Product details loaded successfully",
        data: product,
      });
      return;
    }
    throw new HttpError(productDetails.errorMessage, 400);
  } catch (error: any) {
    return next(error);
  }
};
export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, value } = updateDeliveryStatusSchema.validate({
      orderId: req.params.orderId,
      deliveryStatus: req.body.deliveryStatus,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { orderId, deliveryStatus } = value;
    const orderData = await OrderModel.findOne(
      { _id: orderId, paymentStatus: "Complete" },
      "deliveryStatus updatedAt"
    );
    if (!orderData) {
      throw new HttpError("Order not found", 404);
    }
    const currentDeliveryStatus = orderData.deliveryStatus;
    const { updatedAt } = orderData;
    // To allow fixing status in case something goes wrong but with limits
    if (currentDeliveryStatus === "Delivered" && isMoreThanWeekOld(updatedAt)) {
      throw new HttpError("Order delivered already", 400);
    }
    // update status
    orderData.deliveryStatus = deliveryStatus;
    await orderData.save();

    res.status(200).json({ message: "Delivery status successfully updated" });
  } catch (error: any) {
    return next(error);
  }
};
