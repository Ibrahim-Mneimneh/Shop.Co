import Joi from "joi";
import { validIdSchema, validSize, validSubCategory } from "./productTypes";

export const filterProductsSchema = Joi.object({
  limit: Joi.number().valid(10, 20).optional().default(10),
  page: Joi.number().integer().min(1).optional().default(1),
  color: Joi.string()
    .pattern(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .message("Invalid hex color"),
  minPrice: Joi.number().min(0).max(99999).default(0),
  maxPrice: Joi.number().min(Joi.ref("minPrice")).max(99999),
  category: Joi.string().valid("Men", "Women", "Kids").messages({
    "any.only": "Category must be one of: Men, Women, or Kids.",
  }),
  subCategory: validSubCategory.optional(),
  name: Joi.string().max(200).optional(),
  onSale: Joi.boolean().truthy("true").falsy("false").optional(),
  inStock: Joi.string().valid("In Stock","Out of Stock"),
  size: Joi.array().items(validSize).min(1).max(4).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  sortField: Joi.string().valid("price", "popularity", "rating").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
});

export const productIdSchema = Joi.object({
  productId:validIdSchema
})

export const variantIdSchema = Joi.object({
  variantId: validIdSchema,
});

export const IdSchema = Joi.object({
  variantId: validIdSchema,
  productId: validIdSchema,
});