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
  page: Joi.number().integer().min(0).required(),
  limit: Joi.number().valid(5, 10).optional().default(10),
});

// Extend paginationSchema
export const getMostSoldProductsSchema = paginationSchema.keys({
  frequency: Joi.string().valid("daily", "weekly", "monthly").required(),
});

// Extend filterProductSchema
export const adminFilterProductsSchema = filterProductsSchema.keys({
  unitsSoldRange: Joi.string()
    .valid("0-50", "0-100", "0-500", "500-1000", "1000-10000", "10000")
    .optional(),
  status: Joi.string().valid("Active", "Inactive").optional(),
  minCost: Joi.number().min(0).max(99999).default(0),
  maxCost: Joi.number().min(Joi.ref("minCost")).max(99999),
  inStock: Joi.string().valid("InStock", "OutofStock", "LowStock"), // override
  quantityLeft: Joi.string()
    .valid("0-50", "50-100", "100-200", "200-300", "300-400", "400-500", "+500")
    .optional(),
});

export const adminFilterOrdersSchema = Joi.object({
  orderedAt: Joi.date()
    .iso()
    .less("now")
    .optional()
    .custom((value, helpers) => {
      // Get format YYYY-MM-DD
      const orderedAtDate = new Date(value);
      return orderedAtDate.toISOString().split("T")[0];
    })
    .messages({
      "date.greater": "Ordered at date must be in the past.",
      "date.base": "Ordered at date must be a valid date.",
    }),
  deliveryStatus: Joi.string()
    .valid("Pending", "Complete", "Failed")
    .optional(),
  minProfit: Joi.number().min(0).max(99999).default(0),
  maxProfit: Joi.number().min(Joi.ref("minProfit")).max(99999),
  minPrice: Joi.number().min(0).max(99999).default(0),
  maxPrice: Joi.number().min(Joi.ref("minPrice")).max(99999),
  country: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .optional(),
  name: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .optional(),
});
