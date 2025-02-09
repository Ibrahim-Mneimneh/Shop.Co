import Joi from "joi";
import { validIdSchema, validSize, validSubCategory } from "./productTypes";

export const filterProductsSchema = Joi.object({
  filterDetails: {
    color: Joi.string()
      .pattern(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .message("Invalid hex color"),
    minPrice: Joi.string()
      .custom((value, helpers) => {
        const number = Number(value);
        if (isNaN(number)) {
          return helpers.error("any.invalid", {
            message: "minPrice must be a valid number",
          });
        }
        if (number < 0 || number > 9999) {
          return helpers.error("any.invalid", {
            message: "minPrice must be between 0 and 9999",
          });
        }
        return number;
      })
      .message("Price must be a number between 0 and 9999"),
    maxPrice: Joi.string()
      .custom((value, helpers) => {
        const number = Number(value);
        if (isNaN(number)) {
          return helpers.error("any.invalid", {
            message: "maxPrice must be a valid number",
          });
        }
        if (number < 0 || number > 9999) {
          return helpers.error("any.invalid", {
            message: "maxPrice must be between 0 and 9999",
          });
        }
        return number;
      })
      .message("Price must be a number between 0 and 9999"),
    category: Joi.string().valid("Men", "Women", "Kids").messages({
      "any.only": "Category must be one of: Men, Women, or Kids.",
    }),
    subCategory: validSubCategory,
    name: Joi.string(),
    onSale: Joi.boolean().truthy("true").falsy("false").optional(),
    inStock: Joi.string().valid("In Stock", "Out of Stock"),
    size: Joi.array().items(
      validSize
    ).min(1).max(4),
    rating: Joi.string()
      .custom((value, helpers) => {
        const number = Number(value);
        if (isNaN(number)) {
          return helpers.error("any.invalid", {
            message: "rating must be a valid number",
          });
        }
        if (number < 0 || number > 5) {
          return helpers.error("any.invalid", {
            message: "rating must be between 0 and 5",
          });
        }
        return number;
      })
      .message("rating must be a number between 0 and 5"),
    page: Joi.number()
      .integer()
      .min(1)
      .optional()
      .default(1)
      .custom((value, helpers) => {
        if (typeof value !== "number") {
          return helpers.error("any.invalid", {
            message: "page must be a valid number",
          });
        }
        return value;
      }),
    sortField: Joi.string().valid("price", "popularity", "rating").optional(),
    sortOrder: Joi.string().valid("asc", "desc").optional(),
  },
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