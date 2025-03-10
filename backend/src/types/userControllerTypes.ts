import Joi from "joi";
import { validIdSchema } from "./productTypes";

export interface IRegister {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  country: string;
  postalCode: number;
  bldngNum: number;
}
export interface ILogin {
  email: string;
  password: string;
}

export const registerSchema = Joi.object<IRegister>({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),
  firstname: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .max(15)
    .required()
    .messages({
      "string.regex": "First name should only contain letters and spaces",
      "string.max": "First name should not exceed 15 characters",
      "any.required": "First name is required",
    }),
  lastname: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .max(15)
    .required()
    .messages({
      "string.regex": "Last name should only contain letters and spaces",
      "string.max": "Last name should not exceed 15 characters",
      "any.required": "Last name is required",
    }),
  country: Joi.string()
    .regex(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "any.required": "Country is required",
    }),
  postalCode: Joi.number().required().messages({
    "any.required": "Postal code is required",
  }),
  bldngNum: Joi.number().required().messages({
    "any.required": "Building number is required",
  }),
});
export const loginSchema = Joi.object<ILogin>({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(8).required().messages({
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  }),
});

export const orderIdSchema = Joi.object({
  orderId:validIdSchema
});

export const getOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(2).max(30).default(10),
});

export const reviewProductSchema= Joi.object({
  variantId:validIdSchema,
  orderId:validIdSchema,
  review:Joi.string().min(1).max(100).required(),
  rating:Joi.number().min(1).max(5).required()
})

export const deleteProductReviewSchema = Joi.object({
  variantId: validIdSchema,
  reviewId: validIdSchema,
});

// extends deleteProductReviewSchema
export const updateProductReviewSchema = deleteProductReviewSchema.keys({
  review: Joi.string().min(1).max(100).required(),
  rating: Joi.number().min(1).max(5).required(),
});
