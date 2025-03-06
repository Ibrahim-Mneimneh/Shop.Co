import { NextFunction, Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import {
  adminFilterOrdersSchema,
  adminFilterProductsSchema,
} from "../../../types/adminControllerTypes";
import { searchOrderAgg, searchProductAgg } from "./aggregates";
import { HttpError } from "../../../utils/customErrors";

// Write search orders
export const orderSearch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const query = req.query;
  const { value, error } = adminFilterOrdersSchema.validate(query);
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await searchOrderAgg(value, skip);
    if (!result || result.length === 0) {
      throw new HttpError("No matching orders found", 404);
    }
    const totalCount = count.count;
    const totalPages: number =
      totalCount <= limit ? 1 : Math.ceil(totalCount / limit);
    if (page > totalPages) {
      throw new HttpError(
        "Selected page number exceeds available totalPages: " + totalPages,
        400
      );
    }
    res.status(200).json({
      message: "Matching orders found",
      data: {
        totalPages,
        currentPage: page,
        orders: result,
      },
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return next(error);
    }
    throw new HttpError(error.message, 500);
  }
};

// Write product search
export const productSearch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const query = req.query;
  const sizeQuery = req.query.size;
  req.query.size =
    sizeQuery && typeof sizeQuery === "string"
      ? sizeQuery.split(",")
      : undefined;
  const { value, error } = adminFilterProductsSchema.validate(query, {
    stripUnknown: true,
  });
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await searchProductAgg(value, skip);
    if (!result || result.length === 0) {
      throw new HttpError("No matching products found", 404);
    }
    const totalCount = count.count;
    const totalPages: number =
      totalCount <= limit ? 1 : Math.ceil(totalCount / limit);
    if (page > totalPages) {
      throw new HttpError(
        "Selected page number exceeds available totalPages: " + totalPages,
        400
      );
    }
    res.status(200).json({
      message: "Matching products found",
      data: {
        totalPages,
        currentPage: page,
        products: result,
      },
    });
  } catch (error: any) {
    if (error instanceof HttpError) {
      return next(error);
    }
    throw new HttpError(error.message, 500);
  }
};
