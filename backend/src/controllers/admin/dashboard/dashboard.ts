import {  Response } from "express";

// Get Dashboad (Daily Order count) / (Total Sales & Profit with filters) / Most Sold items / An array for of objects for dailySales / 4 items that are out of stock (based on unitsSold order) / 4 Most recent orders

import { AuthRequest } from "../../../middleware/authMiddleware";
import { getDashboardSchema, getMostSoldProductsSchema, getRecentSchema } from "../../../types/productTypes";
import {
  getMostRecentOrders,
  getMostSold,
  getOrderCount,
  getPendingOrdersAgg,
  getSalesAndProfit,
  getSalesGraph,
} from "./aggregates";

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = getDashboardSchema.validate(req.query);
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
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
    const recentOrders = await getMostRecentOrders();
    const salesGraph = await getSalesGraph(salesGraphFrequency);
    const pendingOrders = await getPendingOrdersAgg();

    res.status(200).json({
      message: "Feed loaded successfully",
      data: {
        orderCount,
        sales,
        mostSold,
        recentOrders,
        salesGraph,
        pendingOrders,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getMostSoldProducts = async (req: AuthRequest, res: Response) => {
  const { error, value } = getMostSoldProductsSchema.validate(req.query);
  if (error) {
    res.status(400).json({
      message:
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
    });
    return;
  }
  const { page = 1, limit = 10, frequency } = value;
  const skip = (page - 1) * limit;
  try {
    const {result,totalCount:count} = await getMostSold(frequency, true, skip, limit);
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
        products: result,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
export const getRecentOrders = async (req: AuthRequest, res: Response) => {
  const { error, value } = getRecentSchema.validate(req.query);
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
    const { result, totalCount: count } = await getMostRecentOrders(
      true,
      skip,
      limit
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

export const getPendingOrders = async (req: AuthRequest, res: Response) => {
  const { error, value } = getRecentSchema.validate(req.query);
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
    const { result, totalCount: count } = await getPendingOrdersAgg(
      true,
      skip,
      limit
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