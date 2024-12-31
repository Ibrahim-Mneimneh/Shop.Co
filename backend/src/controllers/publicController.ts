import { query, Request, RequestHandler, Response } from "express";
import { IObjectId } from "../types/modalTypes";
import mongoose, { Types } from "mongoose";

import { ProductModel } from "../models/product/productModel";
import { ProductImageModel } from "../models/product/productImageModel";
import { filterProductsSchema } from "../types/publicControllerTypes";

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

// View product
export const getProduct = async (req: Request, res: Response) => {
  try {
    // get id prom params
    const isValidProductId: boolean = Types.ObjectId.isValid(
      req.params.productId
    );
    if (!isValidProductId) {
      res.status(404).json({ message: "Invalid ProductId in URL" });
      return;
    }
    const productId: IObjectId = new mongoose.Types.ObjectId(
      req.params.productId
    );
    // fetch for the product & variants
    const variant = await ProductModel.getVariants(productId);
    if (variant.success && variant.productVariant && variant.product) {
      const product = variant.product.toJSON();
      const productData = { ...product, variants: variant.productVariant };
      res.status(200).json({
        message: "Product details sent successfully",
        data: productData,
      });
      return;
    }
    res.status(400).json({ message: variant.errorMessage });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// View products (with filters)
export const getFilteredProducts = async (req: Request, res: Response) => {
  try {
    const query = req.query;
    const { value,error } = filterProductsSchema.validate(
      {
        filterDetails:query,
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
    // console.log(typeof onSale)
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
    if (onSale) variantFilter["variant.isOnSale"] = onSale
    if (inStock) variantFilter["variant.stockStatus"] = inStock === "In Stock";

    if (minPrice || maxPrice) {
      variantFilter.price={}
      if (minPrice) variantFilter.price.$gte= minPrice
      if (maxPrice) variantFilter.price.$lte=maxPrice
    }

    //console.log(productFilter)
    //console.log(variantFilter)
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
          "$variant.quantity.size": size,
        },
      });
    }
    if (sortField) {
      // Add price and rating(!sales)****************************************
      const sortObj: { price?: number; rating?: number } = {};

      if (sortOrder) {
        if (sortField == "rating")
          sortObj.rating = sortOrder === "asc" ? 1 : -1;
        if (sortField === "price") sortObj.price = sortOrder === "asc" ? 1 : -1;
      } else {
        // SortOrder not given Assume ascending
        if (sortField == "rating") sortObj.rating = 1;
        if (sortField === "price") sortObj.price = 1;
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
        "variant.isOnSale": 1,
        "variant.saleOptions.endDate": 1,
        "variant.saleOptions.discountPercentage": 1,
        "variant.stockStatus": 1,
      },
    });
    // we need to recombine the variants (after quantity unwind)
    if (size) {
      aggregationPipeline.push({
        $group: {
          _id: "$_id",
        },
      });
    }
    // add pageNum & limit & Get elements
    aggregationPipeline.push({
      $facet: {
        totalCount: [{ $count: "count" }],
        result: [{ $skip: skip }, { $limit: limit }],
      },
    });

    // Execute aggregation
    const filteredProducts:any= await ProductModel.aggregate(aggregationPipeline);
    console.log(filteredProducts[0].result);
    if(filteredProducts[0] && filteredProducts[0].result.length===0){
        res.status(404).json({message:"No matching products found"})
        return
    }
    const totalCount = filteredProducts[0].totalCount[0].count;
    const totalPages:number= totalCount<=limit?1:Math.ceil(totalCount/limit)
    if(page>totalPages){
        res.status(400).json({ message: "Selected page number exceeds available totalPages: "+totalPages });
        return;
    }
    res.status(200).json({ message: "Products",data:{totalPages,currentPage:page,products:filteredProducts[0].result} });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
