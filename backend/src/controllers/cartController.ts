import { Response,RequestHandler } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import { CartModel, ICart } from "../models/cartModel";
import { addToCartSchema } from "../types/cartControllerTypes";
import { ProductVariantModel } from "../models/product/productVariantModel";
import { IProductRef } from "../types/modalTypes";

// get Cart 
export const getCart: RequestHandler  =async (req:AuthRequest,res:Response)=>{
    try{
        const cartData= await CartModel.findById(req.cartId)
        if(!cartData){
            res.status(404).json({message:"Cart not found"})
            return 
        }
        res.status(200).json({message:"Successful",data:cartData})
        
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Add item to cart 
export const addToCart:RequestHandler =async (req:AuthRequest,res:Response)=>{
    try{
        const cartId = req.cartId 
        // get the variantId, quantity size, color ** define Joi
        const {error, value}= addToCartSchema.validate(req.body)
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') })
            return
        }
        // ensure variant exists and is not Out of Stock or Inactive
        const variantData = await ProductVariantModel.findById(value.variantId)
        if(!variantData){
            res.status(404).json({ message: "Product not found"})
            return
        }
        if(variantData.stockStatus==="Out of Stock" || variantData.status==="Inactive"){
            res.status(400).json({ message: "Product currently unavailable or out of stock"})
            return
        }
        const cartData= await CartModel.findById(cartId)
        if(!cartData){
            res.status(404).json({ message: "Cart not found"})
            return
        }
        let productExists:boolean=false
        let sizeExists:boolean=false
        let productIndex:number=0
        let quantityIndex:number=0

        // check if they're already added  (increase the quantity)
        const cartProducts:IProductRef[] = cartData.products
        // if cart is empty
        if(cartProducts.length===0){
            cartProducts.push({
                variant: value.variantId,
                quantity: [{ size: value.size, quantity: value.quantity }]
            })
            await cartData.save()
            res.status(200).json({message:"Product successfully added"})
            return
        }
        for(let i=0; i<cartProducts.length;i++){
            const currentCartProduct =cartProducts[i]

            if(currentCartProduct.variant.equals(value.variantId)){
                productExists=true
                for(let j=0;j<currentCartProduct.quantity.length;j++){
                    const currentQuantity= currentCartProduct.quantity[j]
                    if(currentQuantity.size===value.size){
                        sizeExists=true
                        productIndex=i
                        quantityIndex=j
                        break
                    }
                }
                if (sizeExists) 
                    break;
            }
        }
        let updateObject={}
        if(productExists){
            if(sizeExists){
                // then update quantity for index i and j
                cartProducts[productIndex].quantity[quantityIndex].quantity+=value.quantity
            }else{
                // then add the new size object
                cartProducts[productIndex].quantity.push({size:value.size,quantity:value.quantity})
            }
        }else{
            // add the whole value to the products
            cartProducts.push({
                variant: value.variantId,
                quantity: [{ size: value.size, quantity: value.quantity }]
            })
        }

        await cartData.save()
        res.status(200).json({message:"Product successfully added"})
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Update existing items (remove/increase/decrease quantity)
export const updateCart:RequestHandler =async (req:AuthRequest,res:Response)=>{
    try{
        // get the productId, quantity size, color
        // check if they have the product
        // check for flag to determine which operation to carry 
        // update cart 
        //send updated cart
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}