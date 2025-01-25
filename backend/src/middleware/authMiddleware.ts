import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel";

import {
  IAdminJwtPayload,
  IJwtPayload,
  isAdminPayload,
  IUserJwtPayload,
} from "../types/jwtPayloadTypes";
import { IObjectId } from "../types/modalTypes";
import mongoose, { Types } from "mongoose";

export interface AuthRequest extends Request {
  userId?: IObjectId;
  cartId?: IObjectId;
  role?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authorization token required!" });
      return;
    }
    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as IJwtPayload;

    const { userId, passwordChangedAt, cartId }: IUserJwtPayload =
      decoded as IUserJwtPayload;
    const user = await UserModel.findById(userId);
    //user exists
    if (!user) {
      res.status(404).json({ message: "UnAuthorized Access - User not found" });
      return;
    }

    // if user is not verified
    if (!user.isVerified) {
      res
        .status(401)
        .json({ message: "UnAuthorized Access - User not verified" });
      return;
      // Send a verification code or not accorrding to the mechanism
    }

    // check if the pass is changed prev tokens are rejected
    if (
      user.passwordChangedAt &&
      user.passwordChangedAt.toISOString() > passwordChangedAt
    ) {
      res
        .status(401)
        .json({ message: "UnAuthorized Access - User token expired" });
      return;
    }
    // verify Token cartId matches user's cartId
    if (cartId.toString() !== user.cart.toString()) {
      res.status(401).json({ message: "UnAuthorized Access" });
      return;
    }
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(cartId)) {
      res.status(401).json({ message: "UnAuthorized Access - Invalid Token" });
      return;
    }
    req.cartId = new mongoose.Types.ObjectId(cartId) as IObjectId;
    req.userId = new mongoose.Types.ObjectId(userId) as IObjectId;

    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Unauthorized Access - Invalid token" });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Unauthorized Access - Token expired" });
      return;
    }

    res.status(500).json({ message: "Server Error" });
  }
};

export const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try{
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authorization token required!" });
      return;
    }
    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as IAdminJwtPayload;

    const isAdminsPayload = isAdminPayload(decoded);
    if (!isAdminsPayload || (decoded  && decoded.role !== "admin")) {
      res.status(401).json({ message: "UnAuthorized Access" });
      return;
    }
    const { userId, passwordChangedAt, role } = decoded;
    const user = await UserModel.findById(userId);
    //user exists
    if (!user || user.role !== "admin") {
      res.status(404).json({ message: "UnAuthorized Access - User not found" });
      return;
    }
    // check if the pass is changed prev tokens are rejected
    if (
      user.passwordChangedAt &&
      user.passwordChangedAt.toISOString() > passwordChangedAt
    ) {
      res
        .status(401)
        .json({ message: "UnAuthorized Access - User token expired" });
      return;
    }
    if (!Types.ObjectId.isValid(userId)) {
      res.status(401).json({ message: "UnAuthorized Access - Invalid Token" });
      return;
    }
    req.role = role as string;
    req.userId = new mongoose.Types.ObjectId(userId) as IObjectId;
    next();
  }catch(error){
    res.status(500).json({ message: "Server Error" });
  }
};