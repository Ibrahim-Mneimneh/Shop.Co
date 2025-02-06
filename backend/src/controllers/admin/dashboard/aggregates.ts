import { PipelineStage } from "mongoose";
import { OrderModel } from "../../../models/orderModel";
import { ProductVariantModel } from "../../../models/product/productVariantModel";

export const startDateCalculator = (
  frequency: "daily" | "weekly" | "monthly" | "yearly"
) => {
  let startDate;
  const currentDate = new Date();
  switch (frequency) {
    case "daily":
      startDate = new Date(currentDate.setHours(0, 0, 0, 0));
      break;
    case "weekly":
      const day = currentDate.getDay();
      startDate = new Date();
      startDate.setDate(currentDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        0
      );
      break;
    case "yearly":
      startDate = new Date(currentDate.getFullYear(), 0, 0);
      break;
    default:
      throw new Error(
        "Invalid frequency. Frequency should be of value ('daily','weekly','monthly')"
      );
  }
  return startDate;
};

export const getOrderCount = async (
  frequency: "daily" | "weekly" | "monthly" | "yearly"
) => {
  const startDate = startDateCalculator(frequency);
  const orderCountAggregate: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: startDate },
        paymentStatus:"Complete"
      },
    },
    { $count: "totalCount" },
  ];

  try {
    const result = await OrderModel.aggregate(orderCountAggregate);
    return result.length === 0
      ? 0
      : result[0].totalCount;
  } catch (error) {
    throw error;
  }
};

export const getSalesAndProfit = async (
  frequency: "daily" | "weekly" | "monthly" | "yearly"
) => {
  const startDate = startDateCalculator(frequency);
  const salesAndProfitAggregate: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $addFields: {
        profit: { $round: [{ $subtract: ["$totalPrice", "$totalCost"] }, 2] },
      },
    },
    {
      $group: {
        _id: null,
        profit: { $sum: "$profit" },
        sales: { $sum: "$totalPrice" },
      },
    },
  ];
  try {
    const result = await OrderModel.aggregate(salesAndProfitAggregate);
    return result.length === 0
      ? { sales: 0, profit: 0 }
      : { sales: result[0].sales, profit: result[0].profit };
  } catch (error) {
    throw error;
  }
};

export const getMostSold = async (
  frequency: "daily" | "weekly" | "monthly",
  pagination: boolean = false,
  skip: number = 0,
  limit: number = 10
) => {
  const startDate = startDateCalculator(frequency);
  const mostSoldAggregate: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $unwind: {
        path: "$products",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: "$products.variant",
        unitsSold: { $sum: "$products.units" },
      },
    },
    {
      $sort: {
        unitsSold: -1,
      },
    },
  ];
  mostSoldAggregate.push(
    pagination
      ? {
          $facet: {
            totalCount: [{ $count: "count" }],
            result: [{ $skip: skip }, { $limit: limit }],
          },
        }
      : { $limit: limit }
  );
  try {
    const result = await OrderModel.aggregate(mostSoldAggregate);
    if (pagination) return result.length===0?[]:result[0];
    return result.length===0?[]:result;
  } catch (error) {
    throw error;
  }
};

export const getMostRecentOrders = async (
  pagination: boolean = false,
  skip: number = 0,
  limit: number = 10
) => {
  const mostRecentOrdersAggregate: PipelineStage[] = [
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
      },
    },
    {
      $project: {
        _id: 1,
        totalPrice: 1,
        totalCost: 1,
        deliveryStatus: 1,
        createdAt: 1,
        name: "$user.name",
        email: "$user.email",
        address: "$user.address",
      },
    },
  ];
  mostRecentOrdersAggregate.push(
    pagination
      ? {
          $facet: {
            totalCount: [{ $count: "count" }],
            result: [{ $skip: skip }, { $limit: limit }],
          },
        }
      : {
          $limit: limit,
        }
  );
  try {
    const result = await OrderModel.aggregate(mostRecentOrdersAggregate);
    if (pagination) return result.length === 0 ? [] : result[0];
    return result.length === 0 ? [] : result;
  } catch (error) {
    throw error;
  }
};

export const getSalesGraph = async (frequency: "monthly" | "yearly") => {
  // if monthly get daily, if yearly get monthly
  const startDate = startDateCalculator(frequency);
  const match = frequency === "monthly" ? "%Y-%m-%d" : "%Y-%m";
  const salesGraphAggregate: PipelineStage[] = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $project: {
        date: { $dateToString: { format: match, date: "$createdAt" } },
        totalPrice: 1,
        totalCost: 1,
      },
    },
    {
      $group: {
        _id: "$date",
        sales: { $sum: "$totalPrice" },
        cost: { $sum: "$totalCost" },
      },
    },
    {
      $project: {
        profit: { $round: [{ $subtract: ["$sales", "$cost"] }, 2] },
        sales: 1,
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ];
  try {
    const result = await OrderModel.aggregate(salesGraphAggregate);
    return result;
  } catch (error) {
    throw error;
  }
};

export const getPendingOrdersAgg = async (
  pagination: boolean = false,
  skip: number = 0,
  limit: number = 10
) => {
  const pendingOrderAggregate: PipelineStage[] = [
    {
      $match: {
        paymentStatus: "Complete",
        deliveryStatus: "Pending",
      },
    },
    {
      $sort: {
        createdAt: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
      },
    },
    {
      $project: {
        _id: 1,
        totalPrice: 1,
        totalCost: 1,
        deliveryStatus: 1,
        createdAt: 1,
        name: "$user.name",
        email: "$user.email",
        address: "$user.address",
      },
    },
  ];
  pendingOrderAggregate.push(
    pagination
      ? {
          $facet: {
            totalCount: [{ $count: "count" }],
            result: [{ $skip: skip }, { $limit: limit }],
          },
        }
      : {
          $limit: limit,
        }
  );
  try {
    const result = await OrderModel.aggregate(pendingOrderAggregate);
    if (pagination) return result.length === 0 ? [] : result[0];
    return result.length === 0 ? [] : result;
  } catch (error) {
    throw error;
  }
};

export const getLowOnStockAgg = async (
  quantity:number=10,
  pagination: boolean = false,
  skip: number = 0,
  limit: number = 10
) => {
  const lowStockAggregate: PipelineStage[] = [
    {
      $match: {
        totalQuantity: { $lte: quantity },
        status: "Active",
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $unwind: {
        path: "$product",
      },
    },
    {
      $project: {
        createdAt: 1,
        status: 1,
        originalPrice: 1,
        unitsSold: 1,
        totalQuantity: 1,
        saleOptions: 1,
        _id: 1,
        name: "$product.name",
        rating: "$product.rating",
      },
    },
  ];

  lowStockAggregate.push(
    pagination
      ? {
          $facet: {
            totalCount: [{ $count: "count" }],
            result: [{ $skip: skip }, { $limit: limit }],
          },
        }
      : {
          $limit: limit,
        }
  );
  try {
    const result = await ProductVariantModel.aggregate(lowStockAggregate);
    if (pagination) return result.length === 0 ? [] : result[0];
    return result.length === 0 ? [] : result;
  } catch (error) {
    throw error;
  }
};