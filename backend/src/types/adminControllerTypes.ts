import Joi from "joi";

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
  frequency: Joi.string().valid("daily", "weekly", "monthly").required(),
  page: Joi.number().integer().min(0).required(),
  limit: Joi.number().valid(5, 10).required(),
});

export const getRecentSchema = Joi.object({
  page: Joi.number().integer().min(0).required(),
  limit: Joi.number().valid(5, 10).required(),
});
