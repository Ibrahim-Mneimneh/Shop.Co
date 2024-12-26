import Joi from "joi"
import { validIdSchema } from "./productTypes"
import { IProductModel } from "../models/product/productModel";
import { IProductVariant } from "../models/product/productVariantModel";


const validSize= Joi.string().valid("XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size").required().messages({
    'any.only': 'Invalid size.',
    'any.required': 'Size is required.'
})

const validQuantity= Joi.number().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.'
})

export const addToCartSchema=Joi.object({
    variantId:validIdSchema,
    size:validSize,
    quantity:validQuantity
})


export const updateCartQuantitySchema=Joi.object({
    updateDetails:Joi.object({
        operation:Joi.string().lowercase().valid("increment","decrement").required(),
        size:validSize,
    }),
    variantId:validIdSchema
})

export const calculatePrice = (quantity: number,variant:IProductVariant,originalPrice:number) => {
    if (variant.isOnSale && variant.saleOptions) {
        return (originalPrice * ((100-variant.saleOptions.discountPercentage) / 100)) * quantity;
    } else {
        return originalPrice * quantity;
    }
};