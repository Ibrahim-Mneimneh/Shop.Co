import { PipelineStage } from "mongoose";
import { OrderModel } from "../../../models/orderModel";
import { ProductModel } from "../../../models/product/productModel";

interface OrderMatchFilter {
  paymentStatus?: string;
  orderedAt?: { $eq: string };
  deliveryStatus?: string;
  country?: string;
  totalPrice?: { $gte?: number; $lte?: number };
  profit?: { $gte?: number; $lte?: number };
  "customer.name"?: { $regex: string; $options: string };
  "customer.country"?: { $regex: string; $options: string };
}

export const searchOrderAgg = async (
  filter: any,
  skip: number,
  limit: number = 10
) => {
  const {
    orderedAt,
    deliveryStatus,
    minProfit,
    maxProfit,
    minPrice,
    maxPrice,
    country,
    customerName,
  } = filter;
  const matchOpp: OrderMatchFilter = { paymentStatus: "Complete" };

  if (orderedAt || deliveryStatus || country) {
    if (orderedAt) {
      matchOpp.orderedAt = { $eq: orderedAt };
    }
    if (deliveryStatus) {
      matchOpp.deliveryStatus = deliveryStatus;
    }
    if (country) {
      matchOpp["customer.country"] = country;
    }
    if (minPrice || maxPrice) {
      matchOpp.totalPrice = {};
      if (minPrice) matchOpp.totalPrice.$gte = minPrice;
      if (maxPrice) matchOpp.totalPrice.$lte = maxPrice;
    }
    if (minProfit || maxProfit) {
      matchOpp.profit = {};
      if (minProfit) matchOpp.profit.$gte = minProfit;
      if (maxProfit) matchOpp.profit.$lte = maxProfit;
    }
    if (customerName) {
      matchOpp["customer.name"] = { $regex: customerName, $options: "i" };
    }
    if (country) {
      matchOpp["customer.country"] = { $regex: country, $options: "i" };
    }
  }
  const searchAgg: PipelineStage[] = [];
  // Add lookup to user (get address & name)
  searchAgg.push(
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "customer",
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1,
              country: {
                $arrayElemAt: [{ $split: ["$address", ","] }, 0],
              },
              address: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$customer",
      },
    }
  );
  if (minProfit || maxProfit || orderedAt) {
    // add the profit field or orderdAt (before matching it)
    const fieldObj: { profit?: any; orderedAt?: any } = {};
    if (minProfit || maxProfit)
      fieldObj.profit = { $subtract: ["$totalPrice", "$totalCost"] };
    if (orderedAt) {
      fieldObj.orderedAt = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
    }
    searchAgg.push({
      $addFields: fieldObj,
    });
  }


  // Add the base match opperation
  searchAgg.push({ $match: matchOpp });

  // Filter data in project
  searchAgg.push({
    $project:{
      _id:1,
      orderedAt:"$createdAt",
      deliveryStatus:1,
      totalCost:1,
      totalPrice:1,
      "customer.name":1,
      "customer.address":1
    }
  })

  // Add limit and skip
  searchAgg.push(
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        result: [{ $skip: skip }, { $limit: limit }],
      },
    },
    {
      $addFields: {
        totalCount: { $first: "$totalCount" },
      },
    }
  );
  // console.log(searchAgg);
  const result = await OrderModel.aggregate(searchAgg);
  return result.length === 0
    ? { result: [], totalCount: { count: 0 } }
    : result[0];
};

export const searchProductAgg = async (
  filter: any,
  skip: number,
  limit: number = 10
): Promise<{ result: []; totalCount: { count: number } }> => {
  const {
    color,
    minPrice,
    maxPrice,
    category,
    subCategory,
    name,
    onSale,
    size,
    rating,
    sortField,
    sortOrder,
    inStock,
    unitsSoldRange, // admin fields
    status,
    minCost,
    maxCost,
    quantityLeft,
  } = filter;

  const productFilter: any = {};
  const variantFilter: any = {};

  // product attributes
  if (status) productFilter.status = status;
  if (category) productFilter.category = category;
  if (subCategory) productFilter.subCategory = subCategory;
  if (rating) productFilter.rating = { $gte: rating };

  // variant attributes
  if (status) productFilter.status = status;
  if (color) variantFilter["variant.color"] = color;
  if (onSale) variantFilter["variant.isOnSale"] = onSale;

  if (inStock) {
    switch (inStock) {
      case "InStock":
        variantFilter["variant.stockStatus"] = "In Stock";
        break;
      case "OutofStock":
        variantFilter["variant.stockStatus"] = "Out of Stock";
        break;
      case "LowStock":
        variantFilter["variant.stockStatus"] = "Low Stock";
        break;
      default:
        variantFilter["variant.stockStatus"] = "In Stock";
        break;
    }
  }

  if (minPrice || maxPrice) {
    variantFilter.price = {};
    if (minPrice) variantFilter.price.$gte = minPrice;
    if (maxPrice) variantFilter.price.$lte = maxPrice;
  }

  if (minCost || maxCost) {
    variantFilter["variant.cost"] = {};
    if (minCost) variantFilter["variant.cost"].$gte = minCost;
    if (maxCost) variantFilter["variant.cost"].$lte = maxCost;
  }

  if (unitsSoldRange) {
    switch (unitsSoldRange) {
      case "0-50":
        variantFilter["variant.unitsSold"] = { $gte: 0, $lte: 50 };
        break;
      case "0-100":
        variantFilter["variant.unitsSold"] = { $gte: 0, $lte: 100 };
        break;
      case "0-500":
        variantFilter["variant.unitsSold"] = { $gte: 0, $lte: 500 };
        break;
      case "500-1000":
        variantFilter["variant.unitsSold"] = { $gte: 500, $lte: 1000 };
        break;
      case "1000-10000":
        variantFilter["variant.unitsSold"] = { $gte: 1000, $lte: 10000 };
        break;
      case "10000":
        variantFilter["variant.unitsSold"] = { $gte: 10000 };
        break;
      default:
        variantFilter["variant.unitsSold"] = { $gte: 0 };
        break;
    }
  }
  if (quantityLeft) {
    switch (quantityLeft) {
      case "0-50":
        variantFilter["variant.totalQuantity"] = { $gte: 0, $lte: 50 };
        break;
      case "50-100":
        variantFilter["variant.totalQuantity"] = { $gte: 50, $lte: 100 };
        break;
      case "100-200":
        variantFilter["variant.totalQuantity"] = { $gte: 100, $lte: 200 };
        break;
      case "200-300":
        variantFilter["variant.totalQuantity"] = { $gte: 200, $lte: 300 };
        break;
      case "300-400":
        variantFilter["variant.totalQuantity"] = { $gte: 300, $lte: 400 };
        break;
      case "400-500":
        variantFilter["variant.totalQuantity"] = { $gte: 400, $lte: 500 };
        break;
      case "500":
        variantFilter["variant.totalQuantity"] = { $gte: 500 };
        break;
      default:
        variantFilter["variant.totalQuantity"] = { $gte: 0 };
        break;
    }
  }

  const searchProductAgg: PipelineStage[] = [];

  // Check name
  if (name) {
    searchProductAgg.push({
      $search: {
        text: {
          query: name,
          path: ["name", "description"],
        },
      },
    });
  }
  // Add match product if needed
  if (Object.keys(productFilter).length != 0) {
    searchProductAgg.push({ $match: productFilter });
  }
  // get the variants & rename the price attribute
  searchProductAgg.push(
    {
      $lookup: {
        from: "productvariants",
        localField: "variants",
        foreignField: "_id",
        as: "variant",
      },
    },
    {
      $unwind: {
        path: "$variant",
      },
    },
    {
      $addFields: {
        // ensure price attribute is salePrice when onSale
        price: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ["$variant.isOnSale", true],
                },
                then: "$variant.saleOptions.salePrice",
              },
              {
                case: {
                  $gte: ["$variant.isOnSale", false],
                },
                then: "$variant.originalPrice",
              },
            ],
            default: 0,
          },
        },
      },
    }
  );
  // add match variants if needed
  if (Object.keys(variantFilter).length != 0) {
    searchProductAgg.push({ $match: variantFilter });
  }
  // Search by size, unwind and match, group by variants
  if (size) {
    searchProductAgg.push({
      $unwind: {
        path: "$variant.quantity",
      },
    });
    searchProductAgg.push({
      $match: {
        "variant.quantity.size": { $in: size },
      },
    });
    if (size.length > 0) {
      searchProductAgg.push({
        $group: {
          _id: "$variant._id",
          variant: {
            $first: {
              _id: "$variant._id",
              isOnSale: "$variant.isOnSale",
              saleOptions: {
                endDate: "$variant.saleOptions.endDate",
                discountPercentage: "$variant.saleOptions.discountPercentage",
                salePrice: "$variant.saleOptions.salePrice",
              },
              images: "$variant.images",
              stockStatus: "$variant.stockStatus",
              status: "$variant.status",
            },
          },
          name: { $first: "$name" },
          category: { $first: "$category" },
          subCategory: { $first: "$subCategory" },
          rating: { $first: "$rating" },
          price: { $first: "$price" },
        },
      });
    }
  }
  if (sortField) {
    const sortObj: {
      price?: 1 | -1;
      rating?: 1 | -1;
      "variant.unitsSold"?: 1 | -1;
    } = {};

    if (sortOrder) {
      if (sortField == "rating") sortObj.rating = sortOrder === "asc" ? 1 : -1;
      if (sortField === "price") sortObj.price = sortOrder === "asc" ? 1 : -1;
      if (sortField === "popularity")
        sortObj["variant.unitsSold"] = sortOrder === "asc" ? 1 : -1;
    } else {
      // SortOrder not given assume ascending
      if (sortField == "rating") sortObj.rating = 1;
      if (sortField === "price") sortObj.price = 1;
      if (sortField === "popularity") sortObj["variant.unitsSold"] = 1;
    }
    searchProductAgg.push({
      $sort: sortObj,
    });
  }
  // Filter attrbutes
  searchProductAgg.push({
    $project: {
      _id: "$variant._id",
      name: 1,
      category: 1,
      subCategory: 1,
      rating: 1,
      status: "$variant.status",
      images: { $first: "$variant.images" },
      isOnSale: "$variant.isOnSale",
      stockStatus: "$variant.stockStatus",
      saleOptions: {
        endDate: {
          $cond: {
            if: { $eq: ["$variant.isOnSale", true] },
            then: { $ifNull: ["$variant.saleOptions.endDate", null] },
            else: null,
          },
        },
        discountPercentage: {
          $cond: {
            if: { $eq: ["$variant.isOnSale", true] },
            then: {
              $ifNull: ["$variant.saleOptions.discountPercentage", null],
            },
            else: null,
          },
        },
        salePrice: {
          $cond: {
            if: { $eq: ["$variant.isOnSale", true] },
            then: { $ifNull: ["$variant.saleOptions.salePrice", null] },
            else: null,
          },
        },
      },
    },
  });
  // Add limit and skip
  searchProductAgg.push(
    {
      $facet: {
        totalCount: [{ $count: "count" }],
        result: [{ $skip: skip }, { $limit: limit }],
      },
    },
    {
      $unwind: {
        path: "$totalCount",
      },
    }
  );
  const result = await ProductModel.aggregate(searchProductAgg);
  return result.length === 0
    ? { result: [], totalCount: { count: 0 } }
    : result[0];
};
