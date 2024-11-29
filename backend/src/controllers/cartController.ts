import { Response,RequestHandler } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import { CartModel } from "../models/cartModel";

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
export const AddToCart:RequestHandler =async (req:AuthRequest,res:Response)=>{
    try{
        // get the productId, quantity size, color 
        // check if they're already added  (increase the quantity)        
        // add to cart 
        // update cart 
        //send updated cart 
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Update existing items (remove/ increase/decrease quantity)
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