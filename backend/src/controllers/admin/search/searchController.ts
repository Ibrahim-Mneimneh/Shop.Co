import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import {
  adminFilterOrdersSchema,
  adminFilterProductsSchema,
} from "../../../types/adminControllerTypes";
import { searchOrderAgg, searchProductAgg } from "./aggregates";

// Write search orders
export const orderSearch = async (req: AuthRequest, res: Response) => {
  const query = req.query;
  const { value, error } = adminFilterOrdersSchema.validate(query);
  if (error) {
    res.status(400).json({
      message:
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
    });
    return;
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await searchOrderAgg(value, skip);
    if (!result || result.length === 0) {
      res.status(404).json({ message: "No matching orders found" });
      return;
    }
    const totalCount = count.count;
    const totalPages: number =
      totalCount <= limit ? 1 : Math.ceil(totalCount / limit);
    if (page > totalPages) {
      res.status(400).json({
        message:
          "Selected page number exceeds available totalPages: " + totalPages,
      });
      return;
    }
    res.status(200).json({
      message: "Matching orders found",
      data: {
        totalPages,
        currentPage: page,
        orders: result,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Write product search
export const productSearch = async (req: AuthRequest, res: Response) => {
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
    res.status(400).json({
      message:
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
    });
    return;
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await searchProductAgg(value, skip);
    if (!result || result.length === 0) {
      res.status(404).json({ message: "No matching products found" });
      return;
    }
    const totalCount = count.count;
    const totalPages: number =
      totalCount <= limit ? 1 : Math.ceil(totalCount / limit);
    if (page > totalPages) {
      res.status(400).json({
        message:
          "Selected page number exceeds available totalPages: " + totalPages,
      });
      return;
    }
    res.status(200).json({
      message: "Matching products found",
      data: {
        totalPages,
        currentPage: page,
        products: result,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
