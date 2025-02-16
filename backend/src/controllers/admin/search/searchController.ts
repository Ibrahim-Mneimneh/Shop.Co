import { Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import { paginationSchema } from "../../../types/adminControllerTypes";
import { searchOrderAgg } from "./aggregates";
import { getLowOnStockAgg } from "../dashboard/aggregates";

// Write search orders
export const orderSearch = async (req: AuthRequest, res: Response) => {
  const { error, value } = paginationSchema.validate(req.query);
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
    const { result, totalCount: count } = await searchOrderAgg(
      value,skip
    );
    if (!result || result.length === 0) {
      res.status(404).json({ message: "No matching products found" });
      return;
    }
    const totalCount = count[0].count;
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
  const { error, value } = paginationSchema.validate(req.query);
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
    const { result, totalCount: count } = await getLowOnStockAgg(
      value,skip
    );
    if (!result || result.length === 0) {
      res.status(404).json({ message: "No matching products found" });
      return;
    }
    const totalCount = count[0].count;
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
        orders: result,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
