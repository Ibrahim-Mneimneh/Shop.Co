import imageSize from "image-size";
import { OrderModel } from "../models/orderModel";

export interface IBase64Image {
  type: string;
  content: string;
}

export interface IIsValidBase64 extends IBase64Image {
  success: boolean;
  base64ErrorMessage: string;
}

// Check size and validity of base64Images
export const isValidBase64 = (base64String: string): IIsValidBase64 => {
  try {
    const requiredRatio: number = 1; // Aspect ratio of 1 only

    const base64Regex = /^data:image\/([a-zA-Z]*);base64,([A-Za-z0-9+/=]*)$/;
    const match = base64String.match(base64Regex);
    if (!match)
      return {
        success: false,
        base64ErrorMessage: "Invalid base64 format",
        content: "",
        type: "",
      };
    const base64Content = match[2];
    const base64Type = match[1];
    console.log(base64Type);

    if (
      !(base64Type === "jpeg" || base64Type === "png" || base64Type === "jpg")
    )
      // Accept only jpeg,png or jpg
      return {
        success: false,
        base64ErrorMessage: "Image should be of type jpeg or png",
        content: "",
        type: "",
      };

    const decodedBuffer = Buffer.from(base64Content, "base64");
    const decodedSize = decodedBuffer.length;

    const maxSize = 5 * 1024 * 1024; // Limit to only 5MB size
    if (decodedSize > maxSize) {
      return {
        success: false,
        base64ErrorMessage: "Image shouldn't exceeds max image size (5MB)",
        content: "",
        type: "",
      };
    }
    // ensure image is has 1:1 ratio
    const decodedDimension = imageSize(decodedBuffer);
    if (!decodedDimension.width || !decodedDimension.height) {
      return {
        success: false,
        base64ErrorMessage: "Invalid image dimensions",
        content: "",
        type: "",
      };
    }
    const { width, height }: { width: number; height: number } =
      decodedDimension as { width: number; height: number };

    const aspectRatio = width / height;

    const tolerance = 0.01; // 1% error

    if (Math.abs(aspectRatio - requiredRatio) > tolerance) {
      return {
        success: false,
        base64ErrorMessage: "Image should be having 1:1 ratio",
        content: "",
        type: "",
      };
    }
    return {
      success: true,
      base64ErrorMessage: "",
      type: base64Type,
      content: base64Content,
    };
  } catch (error) {
    console.log("Image Validity checing error - ");
    return {
      success: false,
      base64ErrorMessage: "Server error",
      content: "",
      type: "",
    };
  }
};
export const isMoreThanWeekOld = (updatedAt: Date) => {
  const currentDate: Date = new Date();
  const differenceInDays =
    (currentDate.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000);
  return differenceInDays >= 7;
};

// (Total Sales & Profit with filters) / Most Sold items / Most Sold items weekly / An array for of objects for dailySales / 4 items that are out of stock (based on unitsSold order) / 4 Most recent orders

const startDateCalculator = (frequency: "daily" | "weekly" | "monthly") => {
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
    default:
      throw new Error(
        "Invalid frequency. Frequency should be of value ('daily','weekly','monthly')"
      );
  }
  return startDate
};

export const getOrderCount = async (frequency:"daily"|"weekly"|"monthly")=>{

  const startDate = startDateCalculator(frequency)
  const orderCountAggregate = [
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    { $count: "totalCount" },
  ];

  try{
    const result = await OrderModel.aggregate(orderCountAggregate);
    return result[0].totalCount;
  }catch(error){
    throw error
  }
}

const getSalesAndProfit = async (frequency:"daily"|"weekly"|"monthly")=>{
  const startDate = startDateCalculator(frequency);
  const salesAndProfitAggregate = [
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
    return {profit:result[0].profit,sales:result[0].sales};
  } catch (error) {
    throw error;
  }
}