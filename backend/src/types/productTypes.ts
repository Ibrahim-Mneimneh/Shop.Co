import Joi, { ErrorReport } from "joi";

import { IProduct } from "../models/product/productModel";
import { IQuantity } from "../models/product/productVariantModel";
import mongoose, { Types } from "mongoose";
import { IObjectId } from "./modalTypes";

export const validIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message("Invalid Id format")
  .required()
  .custom((value: string, helpers): ErrorReport | IObjectId => {
    if (!Types.ObjectId.isValid(value)) {
      return helpers.message({ "any.invalid": "Invalid Id." });
    }
    return new mongoose.Types.ObjectId(value);
  });

const quantitySchema = Joi.object<IQuantity>({
  size: Joi.string()
    .valid("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "One-Size")
    .required(),
  quantityLeft: Joi.number().integer().min(0).required(),
});

export const variantSchema = Joi.object({
  color: Joi.string()
    .pattern(/^#([0-9a-fA-F]{3}){1,2}$/)
    .message("Invalid hex color"),
  quantity: Joi.array().items(quantitySchema).min(1).required(),
  images: Joi.array()
    .items(validIdSchema)
    .min(1)
    .required(),
  originalPrice: Joi.number().min(0).required(),
});

export const addProductSchema = Joi.object<IProduct>({
  name: Joi.string().required().messages({
    "string.base": "Product name is required and must be a valid string.",
  }),
  description: Joi.string().max(600).required().messages({
    "string.max": "Description cannot exceed 600 characters.",
  }),
  category: Joi.string().valid("Men", "Women", "Kids").required().messages({
    "string.base": "Category must be one of: Male, Female or Kids.",
  }),
  subCategory: Joi.string()
    .valid("Jackets", "Pullover", "Suits", "Pants", "T-Shirts", "Accessories")
    .required()
    .messages({
      "string.base":
        "Product type must be one of: Jackets, Pullover, Suits, Pants, T-Shirts, Accessories.",
    }),
});

export const addProductVariantSchema = Joi.object({
  variants: Joi.array().items(variantSchema).min(1).required().messages({
    "array.min": "At least one product variant is required.",
  }),
  productId: validIdSchema,
});

export const updateQuantityDetails = Joi.object({
  size: Joi.string()
    .valid("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "One-Size")
    .required(),
  quantity: Joi.number().integer().min(1).required(),
});

export const updateQuantitySchema = Joi.object({
  details: Joi.object({
    stock: Joi.array()
      .items({
        quantity: Joi.array()
          .items(updateQuantityDetails)
          .min(1)
          .required()
          .messages({
            "array.min": "At least one quantity should be added.",
          }),
        variant: validIdSchema,
      })
      .min(1)
      .required(),
  }),
  productId: validIdSchema,
});

export const deleteProductQuerySchema = Joi.object({
  Id: validIdSchema,
  clearStock: Joi.string()
    .valid("true", "false")
    .optional()
    .trim()
    .lowercase()
    .messages({
      "string.base":
        "Attribute clearStock must be a string ('true' or 'false').",
      "any.only": "Attribute clearStock can only be 'true' or 'false'.",
    }),
});

export const updateVariantSaleSchema = Joi.object({
  saleOptions: Joi.object({
    startDate: Joi.date().iso().greater("now").optional().messages({
      "date.greater": "Sale start date must be in the future.",
      "date.base": "Sale start date must be a valid date.",
    }),
    endDate: Joi.date().iso().greater("now").optional().messages({
      "date.greater": "Sale end date must be after the start date.",
      "date.base": "Sale end date must be a valid date.",
    }),
    discountPercentage: Joi.number().min(1).max(99).optional().messages({
      "number.min": "Discount percentage must be at least 1%.",
      "number.max": "Discount percentage cannot exceed 99%.",
    }),
  })
    .custom((saleOptions, helpers) => {
      const { startDate, endDate } = saleOptions;
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        return helpers.error("any.invalid");
      }
      return saleOptions;
    })
    .messages({
      "any.invalid": "Sale start date must be before the sale end date.",
    }),
  productVarId: validIdSchema,
}).options({ convert: true });

export const updateDeliveryStatusSchema = Joi.object({
  orderId: validIdSchema,
  deliveryStatus: Joi.string()
    .valid("Pending","In-delivery","Delivered")
    .required(),
});

export const getDashboardSchema = Joi.object({
  orderCountFrequency: Joi.string()
    .valid("daily", "weekly", "monthly", "yearly")
    .required(),
  mostSoldFrequency: Joi.string()
    .valid("daily", "weekly", "monthly")
    .required(),
  salesGraphFrequency: Joi.string().valid("monthly", "yearly").required(),
  salesFrequency: Joi.string()
    .valid("daily", "weekly", "monthly", "yearly")
    .required(),
});

export const getMostSoldProductsSchema = Joi.object({
  frequency: Joi.string()
    .valid("daily", "weekly", "monthly")
    .required(),
  page:Joi.number().integer().greater(0).required(),
  limit: Joi.number().valid(5,10).required()
});

export const getRecentSchema = Joi.object({
  page: Joi.number().integer().greater(0).required(),
  limit: Joi.number().valid(5, 10).required(),
});