import Joi from "joi"
import { validIdSchema, validQuantity, validSize } from "./productTypes"

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

export const deleteCartProductSchema= Joi.object({
    variantId:validIdSchema,
    deleteDetails:Joi.object({
        size:validSize
    }) 
})
