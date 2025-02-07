import { query, Request, RequestHandler, Response } from "express";
import { IObjectId } from "../../types/modalTypes";
import mongoose, { Types } from "mongoose";

import { ProductModel } from "../../models/product/productModel";
import { ProductImageModel } from "../../models/product/productImageModel";
import {
  filterProductsSchema,
  productIdSchema,
  variantIdSchema,
} from "../../types/publicControllerTypes";
import { ProductVariantModel } from "../../models/product/productVariantModel";

export const getImage: RequestHandler = async (req: Request, res: Response) => {
  try {
    const imageIdString: string = req.params.imageId;
    // Check format
    if (!mongoose.Types.ObjectId.isValid(imageIdString)) {
      res.status(400).json({ message: "Invalid image ID format" });
      return;
    }
    // convert to objectId
    const ImageId: IObjectId = new mongoose.Types.ObjectId(imageIdString);

    const image = await ProductImageModel.findById(ImageId);
    if (!image) {
      res.status(404).json({ message: "Image not found" });
      return;
    }
    res.setHeader("Content-Type", "image/" + image.type);
    const imageBuffer = Buffer.from(image.image, "base64");
    res.send(imageBuffer);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getVariant = async (req: Request, res: Response) => {
  try {
    // get id from params
    const { error, value } = variantIdSchema.validate({
      variantId: req.params.variantId,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const { variantId } = value;
    const variantData = await ProductVariantModel.findOne({
      _id: variantId,
      status: "Active",
    });
    if (!variantData) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    // get other variants and their images
    const productData = await ProductModel.findById(
      variantData.product
    ).populate({
      path: "variants",
      match: { status: "Active", _id: { $ne: variantId } },
      options: { limit: 1 },
      select: "_id images",
    });
    if (!productData) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    const filteredProductData = productData.toJSON();
    const filteredVariantData = variantData.toJSON();
    res.status(200).json({
      message: "Product details available",
      data: { ...filteredProductData, ...filteredVariantData },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// View products (with filters)
export const getFilteredProducts = async (req: Request, res: Response) => {
  try {
    const query = req.query;
    const sizeQuery = req.query.size;
    req.query.size =
      sizeQuery && typeof sizeQuery === "string"
        ? sizeQuery.split(",")
        : undefined;
    const { value, error } = filterProductsSchema.validate(
      {
        filterDetails: query,
      },
      { stripUnknown: true }
    );
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const {
      color,
      minPrice,
      maxPrice,
      category,
      subCategory,
      name,
      onSale,
      inStock,
      size,
      rating,
      page = 1,
      sortField,
      sortOrder,
    } = value.filterDetails;
    // Configure skip based on page
    const limit: number = 24; // Define page limit
    const skip = (page - 1) * limit;

    const productFilter: any = { status: "Active" };
    const variantFilter: any = { "variant.status": "Active" };

    // product attributes
    if (category) productFilter.category = category;
    if (subCategory) productFilter.subCategory = subCategory;
    if (rating) productFilter.rating = { $gte: rating };

    if (color) variantFilter["variant.color"] = color;
    if (onSale) variantFilter["variant.isOnSale"] = onSale;
    if (inStock) variantFilter["variant.stockStatus"] = inStock === "In Stock";

    if (minPrice || maxPrice) {
      variantFilter.price = {};
      if (minPrice) variantFilter.price.$gte = minPrice;
      if (maxPrice) variantFilter.price.$lte = maxPrice;
    }

    const aggregationPipeline: any[] = [
      { $match: productFilter },
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
      },
      {
        $match: variantFilter,
      },
    ];

    // if product name is given
    if (name) {
      aggregationPipeline.unshift({
        $search: {
          text: {
            query: name,
            path: ["name", "description"],
          },
        },
      });
    }
    if (size) {
      aggregationPipeline.push({
        $unwind: {
          path: "$variant.quantity",
        },
      });
      aggregationPipeline.push({
        $match: {
          "variant.quantity.size": { $in: size },
        },
      });
      if (size.length > 0) {
        aggregationPipeline.push({
          $group: {
            _id: "$variant._id",
            variant: {
              $first: {
                _id: "$variant._id",
                isOnSale: "$variant.isOnSale",
                unitsSold: "$variant.unitsSold",
                saleOptions: {
                  endDate: "$variant.saleOptions.endDate",
                  discountPercentage: "$variant.saleOptions.discountPercentage",
                },
                images: "$variant.images",
              },
            },
            name: { $first: "$name" },
            category: { $first: "$category" },
            subCategory: { $first: "$subCategory" },
            rating: { $first: "$rating" },
            price: { $first: "$price" },
            isOnSale: { $first: "$isOnSale" },
            stockStatus: { $first: "$variant.stockStatus" },
          },
        });
      }
    }

    if (sortField) {
      const sortObj: {
        price?: number;
        rating?: number;
        "variant.unitsSold"?: number;
      } = {};

      if (sortOrder) {
        if (sortField == "rating")
          sortObj.rating = sortOrder === "asc" ? 1 : -1;
        if (sortField === "price") sortObj.price = sortOrder === "asc" ? 1 : -1;
        if (sortField === "popularity")
          sortObj["variant.unitsSold"] = sortOrder === "asc" ? 1 : -1;
      } else {
        // SortOrder not given assume ascending
        if (sortField == "rating") sortObj.rating = 1;
        if (sortField === "price") sortObj.price = 1;
        if (sortField === "popularity") sortObj["variant.unitsSold"] = 1;
      }

      aggregationPipeline.push({
        $sort: sortObj,
      });
    }
    // Filter attrbutes
    aggregationPipeline.push({
      $project: {
        _id: "$variant._id",
        name: 1,
        category: 1,
        subCategory: 1,
        rating: 1,
        price: 1,
        images: "$variant.images",
        isOnSale: "$variant.isOnSale",
        stockStatus: "$variant.stockStatus",
        saleEndDate: {
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
      },
    });
    // add pageNum & limit & Get elements
    aggregationPipeline.push({
      $facet: {
        totalCount: [{ $count: "count" }],
        result: [{ $skip: skip }, { $limit: limit }],
      },
    });

    // Execute aggregation
    const filteredProducts: any = await ProductModel.aggregate(
      aggregationPipeline
    );
    if (filteredProducts[0] && filteredProducts[0].result.length === 0) {
      res.status(404).json({ message: "No matching products found" });
      return;
    }
    const totalCount = filteredProducts[0].totalCount[0].count;
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
        products: filteredProducts[0].result,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
