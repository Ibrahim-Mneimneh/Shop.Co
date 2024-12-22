import Joi from "joi"
import { validIdSchema } from "./productTypes"

export const addToCartSchema=Joi.object({
    variantId:validIdSchema,
    size:Joi.string().valid("XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size").required().messages({
            'any.only': 'Invalid size.',
            'any.required': 'Size is required.'
        }),
    quantity:Joi.number().min(1).required().messages({
            'number.min': 'Quantity must be at least 1.',
            'any.required': 'Quantity is required.'
        })
})