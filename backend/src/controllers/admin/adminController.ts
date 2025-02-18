import { Request, RequestHandler, Response } from "express";
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

// Admin login
export const adminLogin: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }

    const user = await UserModel.findOne({ email: value.email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const match = await bcrypt.compare(value.password, user.password);

    if (!match) {
      res.status(400).json({ message: "Incorrect email/password" });
      return;
    }

    // generate the user token (JWT)
    const token: string = jwtGenerator(
      user._id as IObjectId,
      user.passwordChangedAt ? user.passwordChangedAt.toISOString() : "",
      undefined,
      user.role
    );

    res.status(200).json({ message: "Login Successful", data: user, token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// View product & its variants
export const getProduct = async (req: Request, res: Response) => {
  try {
    // get id from params
    const { error, value } = productIdSchema.validate({
      productId: req.params.productId,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
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
    res.status(400).json({ message: productDetails.errorMessage });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
export const updateDeliveryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = updateDeliveryStatusSchema.validate({
      orderId: req.params.orderId,
      deliveryStatus: req.body.deliveryStatus,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const { orderId, deliveryStatus } = value;
    const orderData = await OrderModel.findOne(
      { _id: orderId, paymentStatus: "Complete" },
      "deliveryStatus updatedAt"
    );
    if (!orderData) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    const currentDeliveryStatus = orderData.deliveryStatus;
    const { updatedAt } = orderData;
    // To allow fixing status in case something goes wrong but with limits
    if (currentDeliveryStatus === "Delivered" && isMoreThanWeekOld(updatedAt)) {
      res.status(400).json({ message: "Order already delivered" });
      return;
    }
    // update status
    orderData.deliveryStatus = deliveryStatus;
    await orderData.save();

    res.status(200).json({ message: "Delivery status successfully updated" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};