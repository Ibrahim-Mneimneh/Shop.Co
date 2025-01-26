import { PipelineStage } from "mongoose";
import { OrderModel } from "../../models/orderModel";

/// Items that are low on stock (most unitsSold order) / delivery pending orders (by oldest)

const startDateCalculator = (
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
        1
      );
      break;
    case "yearly":
      startDate = new Date(currentDate.getFullYear(), 1, 1);
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
      },
    },
    { $count: "totalCount" },
  ];

  try {
    const result = await OrderModel.aggregate(orderCountAggregate);
    return result[0].totalCount;
  } catch (error) {
    throw error;
  }
};

const getSalesAndProfit = async (
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
        totalProfit: { $sum: "$profit" },
        Sales: { $sum: "$totalPrice" },
      },
    },
  ];
  try {
    const result = await OrderModel.aggregate(salesAndProfitAggregate);
    return { profit: result[0].profit, sales: result[0].sales };
  } catch (error) {
    throw error;
  }
};

const getMostSold = async (frequency: "daily" | "weekly" | "monthly") => {
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
    { $limit: 10 },
  ];
  try {
    const result = await OrderModel.aggregate(mostSoldAggregate);
    return { result };
  } catch (error) {
    throw error;
  }
};

const getMostRecentOrders = async () => {
  const mostRecentOrdersAggregate: PipelineStage[] = [
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 10,
    },
  ];
  try {
    const result = await OrderModel.aggregate(mostRecentOrdersAggregate);
    return { result };
  } catch (error) {
    throw error;
  }
};

const getSalesGraph = async (frequency: "monthly" | "yearly") => {
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
        profit: { $round: [{ $subtract: ["$totalPrice", "$totalCost"] }, 2] },
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
    return { result };
  } catch (error) {
    throw error;
  }
};

const getPendingOrders = async ()=>{
    try {
      const result = await OrderModel.aggregate([
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
          $project: {
            totalPrice: 1,
            deliveryStatus: 1,
            _id: 1,
            createdAt: 1,
            products: {
              $map: {
                input: "$products",
                as: "product",
                in: {
                  _id: "$$product._id",
                  variant: "$$product.variant",
                  name: "$$product.name",
                  quantity: "$$product.quantity",
                  price: "$$product.price",
                },
              },
            },
          },
        },
      ]);
      return { result };
    } catch (error) {
      throw error;
    }
}