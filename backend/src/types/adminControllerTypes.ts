import Joi from "joi";
import { filterProductsSchema } from "./publicControllerTypes";

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

export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(0)
    .required(),
  limit: Joi.number()
    .valid(5, 10)
    .optional().default(10)
});

// Extend paginationSchema
export const getMostSoldProductsSchema = paginationSchema.keys({
  frequency: Joi.string().valid("daily", "weekly", "monthly").required(),
});

// Extend filterProductSchema
export const adminFilterProductsSchema = filterProductsSchema.keys({
  unitsSoldRange: Joi.string()
    .valid("0-100", "+100", "+500", "+1000", "+10000")
    .optional(),
  status: Joi.string().valid("Active", "Inactive").optional(),
  minCost: Joi.number().min(0).max(99999).default(0),
  maxCost: Joi.number().min(Joi.ref("minCost")).max(99999),
  inStock: Joi.string().valid("In Stock", "Out of Stock", "Low Stock"), // override
  quantityLeft: Joi.string()
    .valid("0-50", "50-100", "100-200", "200-300", "300-400", "400-500", "+500")
    .optional(),
});
