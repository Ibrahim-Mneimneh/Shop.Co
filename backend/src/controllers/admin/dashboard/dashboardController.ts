import { NextFunction, Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import {
  getLowOnStockAgg,
  getMostRecentOrders,
  getMostSold,
  getOnSaleAgg,
  getOrderCount,
  getPendingOrdersAgg,
  getSalesAndProfit,
  getSalesGraph,
} from "./aggregates";
import {
  getDashboardSchema,
  getMostSoldProductsSchema,
  paginationSchema,
} from "../../../types/adminControllerTypes";
import { HttpError } from "../../../utils/customErrors";

// Get Dashboad
// (Daily Order count) / (Total Sales & Profit with filters) / Most Sold products / monthly or yearly Sales Graph / Products that are out of stock / Most recent orders / Delivery pending orders
export const getDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, value } = getDashboardSchema.validate(req.query);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const {
      orderCountFrequency,
      mostSoldFrequency,
      salesGraphFrequency,
      salesFrequency,
    } = value;

    // Call the functions and return the data
    const orderCount = await getOrderCount(orderCountFrequency);
    const sales = await getSalesAndProfit(salesFrequency);
    const mostSold = await getMostSold(mostSoldFrequency);
    const recentOrders = await getMostRecentOrders(false, 0, 5);
    const salesGraph = await getSalesGraph(salesGraphFrequency);
    const pendingOrders = await getPendingOrdersAgg(false, 0, 5);
    const onSale = await getOnSaleAgg(false, 0, 5);
    const lowStock = await getLowOnStockAgg(false, 0, 5);
    // on sale & low on stock
    res.status(200).json({
      message: "Feed loaded successfully",
      data: {
        orderCount,
        sales,
        mostSold,
        recentOrders,
        salesGraph,
        pendingOrders,
        lowStock,
        onSale,
      },
    });
  } catch (error: any) {
    return next(error);
  }
};

export const getMostSoldProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = getMostSoldProductsSchema.validate(req.query);
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10, frequency } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await getMostSold(
      frequency,
      true,
      skip,
      limit
    );
    if (!result || result.length === 0) {
      throw new HttpError("No matching products found", 404);
    }
    const totalCount = count[0].count;
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
    return next(error);
  }
};
export const getRecentOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = paginationSchema.validate(req.query);
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await getMostRecentOrders(
      true,
      skip,
      limit
    );
    if (!result || result.length === 0) {
      throw new HttpError("No matching orders found", 404);
    }
    const totalCount = count[0].count;
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
    return next(error);
  }
};

export const getPendingOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = paginationSchema.validate(req.query);
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await getPendingOrdersAgg(
      true,
      skip,
      limit
    );
    if (!result || result.length === 0) {
      throw new HttpError("No matching orders found", 404);
    }
    const totalCount = count[0].count;
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
    return next(error);
  }
};

export const getProductsOnSale = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = paginationSchema.validate(req.query);
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await getOnSaleAgg(true, skip, limit);
    if (!result || result.length === 0) {
      throw new HttpError("No matching products found", 404);
    }
    const totalCount = count[0].count;
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
        orders: result,
      },
    });
  } catch (error: any) {
    return next(error);
  }
};

export const getProductsLowOnStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = paginationSchema.validate(req.query);
  if (error) {
    throw new HttpError(
      "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      400
    );
  }
  const { page = 1, limit = 10 } = value;
  const skip = (page - 1) * limit;
  try {
    const { result, totalCount: count } = await getLowOnStockAgg(
      true,
      skip,
      limit
    );
    if (!result || result.length === 0) {
      throw new HttpError("No matching products found", 404);
    }
    const totalCount = count[0].count;
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
        orders: result,
      },
    });
  } catch (error: any) {
    return next(error);
  }
};
