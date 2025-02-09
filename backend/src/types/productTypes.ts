import Joi, { ErrorReport } from "joi";

import { IProduct } from "../models/product/productModel";
import { IQuantity } from "../models/product/productVariantModel";
import mongoose, { Types } from "mongoose";
import { IObjectId, } from "./modalTypes";

export const validBooleanQuery=Joi.string().valid("true", "false")
  .optional()
  .trim()
  .lowercase()
  .messages({
  "string.base":
  "Attribute clearStock must be a string ('true' or 'false').",
  "any.only": "Attribute clearStock can only be 'true' or 'false'."
})

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

export const validSize = Joi.string()
  .valid("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "One-Size")
  .required()
  .messages({
    "any.only": "Invalid size.",
    "any.required": "Size is required.",
  });

export const validQuantity = Joi.number().min(1).required().messages({
  "number.min": "Quantity must be at least 1.",
  "any.required": "Quantity is required.",
});

export const validCategory = Joi.string()
  .valid("Men", "Women", "Kids")
  .required()
  .messages({
    "string.base": "Category must be one of: Men, Women or Kids.",
  });

export const validSubCategory = Joi.string()
  .valid("Jackets", "Pullover", "Suits", "Pants", "T-Shirts", "Accessories")
  .required()
  .messages({
    "string.base":
      "Product type must be one of: Jackets, Pullover, Suits, Pants, T-Shirts, Accessories.",
  });

const quantitySchema = Joi.object<IQuantity>({
  size: validSize,
  quantityLeft: validQuantity,
});

export const quantityDetails = Joi.object({
  size: validSize,
  quantity: validQuantity,
});

export const variantSchema = Joi.object({
  color: Joi.string()
    .pattern(/^#([0-9a-fA-F]{3}){1,2}$/)
    .message("Invalid hex color"),
  quantity: Joi.array().items(quantitySchema).min(1).required(),
  images: Joi.array().items(validIdSchema).min(1).required(),
  originalPrice: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
}).custom((value, helpers) => {
  const totalQuantity = value.quantity.reduce(
    (sum: number, item: { quantityLeft: number }) => sum + item.quantityLeft,
    0
  );
  return { ...value, totalQuantity };
});

// Product & Variant Addition 
export const addProductSchema = Joi.object<IProduct>({
  name: Joi.string().required().messages({
    "string.base": "Product name is required and must be a valid string.",
  }),
  description: Joi.string().max(600).required().messages({
    "string.max": "Description cannot exceed 600 characters.",
  }),
  category: validCategory,
  subCategory: validSubCategory,
});

export const addProductVariantSchema = Joi.object({
  variants: Joi.array().items(variantSchema).min(1).required().messages({
    "array.min": "At least one product variant is required.",
  }),
  productId: validIdSchema,
});

// Quantity Update
export const updateQuantitySchema = Joi.object({
  details: Joi.object({
    stock: Joi.array()
      .items({
        quantity: Joi.array()
          .items(quantityDetails)
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

// Delete Product
export const deleteProductQuerySchema = Joi.object({
  Id: validIdSchema,
  clearStock: validBooleanQuery
});

// Sale updates 
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


// Status (Delivery & Activity) Updates
export const updateDeliveryStatusSchema = Joi.object({
  orderId: validIdSchema,
  deliveryStatus: Joi.string()
    .valid("Pending", "In-delivery", "Delivered")
    .required(),
});

export const reActivateProductSchema = Joi.object({
  productId: validIdSchema,
  activateAll:validBooleanQuery,
  variants: Joi.alternatives().conditional("activateAll",{is:"true",then:Joi.valid(null),otherwise:Joi.array().items(validIdSchema).min(1).required()})
})
