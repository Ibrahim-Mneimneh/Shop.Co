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
import { HttpError } from "../utils/customErrors";

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
      throw new HttpError("Authorization token required", 400);
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
      throw new HttpError("UnAuthorized Access - User not found", 401);
    }

    // if user is not verified
    if (!user.isVerified) {
      throw new HttpError("UnAuthorized Aceess - User not verified", 401);
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
      throw new HttpError("UnAuthorized Access", 401);
    }
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(cartId)) {
      throw new HttpError("UnAuthorized Access - Invalid token", 401);
    }
    req.cartId = new mongoose.Types.ObjectId(cartId) as IObjectId;
    req.userId = new mongoose.Types.ObjectId(userId) as IObjectId;

    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next( new HttpError("UnAuthorized Access - Invalid token", 401));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new HttpError("UnAuthorized Access - Token expired", 401));
    }

    return next(error);
  }
};

export const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new HttpError("Authorization token required", 400);
    }
    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as IAdminJwtPayload;

    const isAdminsPayload = isAdminPayload(decoded);
    if (!isAdminsPayload || (decoded && decoded.role !== "admin")) {
      throw new HttpError("UnAuthorized Access", 401);
    }
    const { userId, passwordChangedAt, role } = decoded;
    const user = await UserModel.findById(userId);
    //user exists
    if (!user || user.role !== "admin") {
      throw new HttpError("UnAuthorized Access - User not found", 401);
    }
    // check if the pass is changed prev tokens are rejected
    if (
      user.passwordChangedAt &&
      user.passwordChangedAt.toISOString() > passwordChangedAt
    ) {
      throw new HttpError("UnAuthorized Access - token expired", 401);
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError("UnAuthorized Access - Invalid token", 401);
    }
    req.role = role as string;
    req.userId = new mongoose.Types.ObjectId(userId) as IObjectId;
    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new HttpError("UnAuthorized Access - Invalid token", 401));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new HttpError("UnAuthorized Access - Token expired", 401));
    }
    return next(error);
  }
};
