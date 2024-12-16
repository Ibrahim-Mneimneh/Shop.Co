import Joi from "joi"


import { IProduct } from "../models/productModel"
import { IQuantity } from "../models/productVariantModel"
import { Types } from "mongoose"

const quantitySchema =Joi.object<IQuantity
>({
    size:Joi.string().valid("XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size").required(),
    quantityLeft:Joi.number().integer().min(0).required()
})

export const saleOptionsSchema = Joi.object({
    startDate:Joi.date().iso().greater("now").required().messages({
      "date.greater": "Sale start date must be in the future.",
      "date.base": "Sale start date must be a valid date.",
    }),
    endDate:Joi.date().iso().greater(Joi.ref("startDate")).required().messages({
      "date.greater": "Sale end date must be after the start date.",
      "date.base": "Sale end date must be a valid date.",
    }),
    discountPercentage:Joi.number().min(1).max(99).required().messages({
    "number.min": "Discount percentage must be at least 1%",
    "number.max": "Discount percentage cannot exceed 99%",
  })
}).options({ convert: true }); 

export const variantSchema=Joi.object({
    color:Joi.string().pattern(/^#([0-9a-fA-F]{3}){1,2}$/).message('Invalid hex color'),
    quantity: Joi.array().items(quantitySchema).min(1).required(),
    images: Joi.array()
      .items(
        Joi.string().required().custom((value, helper) => {
          if (!Types.ObjectId.isValid(value)) {
            return helper.message({"any.invalid": "Image must be a valid ObjectId."});
          }
          return value;
        })
      ).min(1).required(),
    originalPrice: Joi.number().min(0).required(),
    isOnSale: Joi.boolean().default(false),
    saleOptions: Joi.when("isOnSale", {
      is: true,
      then: saleOptionsSchema.required(),
      otherwise: Joi.forbidden(),
    }),
})

export const addProductSchema = Joi.object<IProduct>({
  name: Joi.string().required().messages({
    "string.base": "Product name is required and must be a valid string.",
  }),
  description: Joi.string().max(600).required().messages({
    "string.max": "Description cannot exceed 600 characters.",
  }),
  gender: Joi.string().valid("Men", "Women", "Unisex","Kids").required().messages({
    "string.base": "Gender must be one of: Male, Female, Kids or Unisex.",
  }),
  category: Joi.string()
    .valid(
      "Jackets",
      "Pullover",
      "Suits",
      "Pants",
      "T-Shirts",
      "Accessories"
    )
    .required()
    .messages({
      "string.base": "Category must be one of: Jackets, Pullover, Suits, Pants, T-Shirts, Accessories.",
    }),
})

export const addProductVariantSchema=Joi.object({
  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .required()
    .messages({
      "array.min": "At least one product variant is required.",
    }),
});

export const updateQuantityDetails=Joi.object({
  size:Joi.string().valid("XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size").required(),
  quantity:Joi.number().integer().min(0).required()
})

export const updateQuantitySchema =Joi.object({
  stock:Joi.array()
      .items({
    details:Joi.array()
    .items(updateQuantityDetails).min(1).required()
      .messages({
      "array.min": "At least one quantity should be added.",
      }),
    variant:Joi.string().required().custom((value, helper) => {
        if (!Types.ObjectId.isValid(value)) {
            return helper.message({"any.invalid": "Variant must be a valid ObjectId."});
        }
          return value;
        })
}).min(1).required(),

})

export const deleteProductQuerySchema = Joi.object({
  clearStock: Joi.string().valid('true', 'false').optional().trim().lowercase(),
});