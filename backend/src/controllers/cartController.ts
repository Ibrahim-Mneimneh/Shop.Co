import { Response,RequestHandler } from "express";

import { AuthRequest } from "../middleware/authMiddleware";
import { CartModel, ICart } from "../models/cartModel";
import { addToCartSchema, updateCartQuantitySchema } from "../types/cartControllerTypes";
import { IProductVariant, ProductVariantModel } from "../models/product/productVariantModel";
import { IObjectId, IOrderQuantity, IProductRef } from "../types/modalTypes";
import { valid } from "joi";

// get Cart 
export const getCart: RequestHandler  =async (req:AuthRequest,res:Response)=>{
    try{
        const cartData:ICart | null= await CartModel.findById(req.cartId).populate({
            path:"products.variant",
            select:"-quantity",
            populate:{
                path:"product",
                select:"name rating -_id",
            }
        }).select("-products.quantity._id -products._id")
        if(!cartData){
            res.status(404).json({message:"Cart not found"})
            return 
        }
        if(cartData.products.length===0){
            res.status(200).json({message:"Cart is empty",cartData:{}})
            return
        }
        let totalPrice = 0
        cartData.products.forEach((product)=>{
            const variant = product.variant as IProductVariant
            const quantity:IOrderQuantity[]= product.quantity
            const originalPrice: number = variant.originalPrice;
            if(quantity.length===1){
                if(variant.isOnSale && variant.saleOptions){
                totalPrice+=(originalPrice*((100-variant.saleOptions.discountPercentage)/100))*quantity[0].quantity
                }else{
                    totalPrice+=(originalPrice*quantity[0].quantity)
                }
            }else{
               quantity.forEach(quantity=>{
                if(variant.isOnSale && variant.saleOptions){
                totalPrice+=(originalPrice*((100-variant.saleOptions.discountPercentage)/100))*quantity.quantity
                }else{
                    totalPrice+=(originalPrice*quantity.quantity)
                }
               })
            }
        })
        totalPrice = parseFloat(totalPrice.toFixed(2));
    

        res.status(200).json({message:"Successful",data:{cartData,totalPrice}})
        
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
        const {variantId,size,quantity:requestedQuantity}=value
        // ensure variant exists and is not Out of Stock or Inactive
        const variantData = await ProductVariantModel.findById(variantId,{"quantity": { $elemMatch: { size } },stockStatus:1,status:1})

        if(!variantData || variantData.quantity.length===0){
            const message:string = !variantData?"Product not found":"Requested size isn't available"
            res.status(404).json({ message })
            return
        }
        const quantityLeft=variantData.quantity[0].quantityLeft
        
        if(requestedQuantity>quantityLeft || variantData.stockStatus==="Out of Stock" || variantData.status==="Inactive"){
            let message= requestedQuantity>quantityLeft ? "Product stock limit reached":"Product currently unavailable or out of stock"
            res.status(400).json({ message})
            return
        }
        
        const cartData= await CartModel.findById(cartId,{products:{$elemMatch:{variant:variantId}}})
        if(!cartData){
            res.status(404).json({ message: "Cart not found"})
            return
        }

        let sizeExists:boolean=false
        let updatedCart:ICart | null = null
        // if cart doesnt have the product
        if(cartData.products.length===0){
            updatedCart= await CartModel.findByIdAndUpdate(cartId,{
                $addToSet:{
                    products:{variant:variantId,quantity:{size,quantity:requestedQuantity}}
                }
            },{new:true})
        }else{
            // check if they're already added  (increase the quantity)
            let sizeIndex:number=0
            const cartProductQuantity=cartData.products[0].quantity
            for(let i=0;i<cartProductQuantity.length;i++){
                const quantity=cartProductQuantity[i]
                if(quantity.size===size){
                    sizeExists=true
                    sizeIndex=i
                    break
                }
            }
            if(sizeExists){ // if the size exists & added quantity < than that left
                if(cartProductQuantity[sizeIndex].quantity
                    +requestedQuantity>quantityLeft){
                    res.status(400).json({ message:"Product stock limit reached"})
                    return
                }
                updatedCart= await CartModel.findOneAndUpdate(
                    {_id:cartId,"products.variant":variantId,"products.quantity.size":size},{
                    $inc:{
                        "products.$.quantity.$[elem].quantity":requestedQuantity
                    }
                },{ arrayFilters:[ {"elem.size":size} ],new:true})
            }else{ // then add the new size object
                updatedCart= await CartModel.findOneAndUpdate(
                    {_id:cartId,"products.variant":variantId},{
                    $addToSet:{
                        "products.$.quantity":{quantity:requestedQuantity,size}
                    }
                },{new:true})
            }
            
        }
        if(!updatedCart){
            res.status(400).json({message:"Failed to update cart"})
            return
        }
        res.status(200).json({message:"Product successfully added", data:updatedCart })
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Update existing items (increase/decrease quantity)
export const updateCartQuantity:RequestHandler =async (req:AuthRequest,res:Response)=>{
    try{
        // {operation nd size, productId from params}
        const cartId= req.cartId
        const {error,value}= updateCartQuantitySchema.validate({variantId:req.params.productId,updateDetails:req.body})
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') })
            return
        }
        const {variantId}=value
        const {sizeId,operation}=value.updateDetails
        const cartData= await CartModel.findOne({_id:cartId,"products.variant":variantId,"products.quantity._id":sizeId},{"products.$":1,"products.quantity.$": 1}).populate({
            path:"products.variant",
            select:"quantity stockStatus status",
            match:{"quantity._id":sizeId}
        })
        if(!cartData){
            res.status(404).json({ message: "Product not found"})
            return
        }
        const variantData =cartData.products[0].variant as IProductVariant
        if(variantData.stockStatus==="Out of Stock" || variantData.status==="Inactive"){
            res.status(400).json({ message: "Product currently unavailable or out of stock"})
            return
        }
        let updatedCart:ICart |null =null
        const quantity=cartData.products[0].quantity[0].quantity
        if(operation==="increment" || operation==="decrement"){
            const quantityLeft =variantData.quantity[0].quantityLeft
            const quantityChange = operation === "increment" ? 1 : -1;

            // if increments it exceeds quantity left 
            if(operation==="increment" && quantityLeft<quantity+1){ 
                res.status(400).json({ message: "Product stock limit reached"})
                return
            }
            
            if (operation === "decrement" && quantity <= 1) {
                res.status(400).json({ message: "Cannot decrement below minimum quantity" });
                return
            }
            
            updatedCart = await CartModel.findOneAndUpdate({ _id: cartId, 
                "products.variant": variantId, 
                "products.quantity._id": sizeId 
            },{$inc: { "products.$.quantity.$[elem].quantity": quantityChange }},
            {arrayFilters: [{ "elem._id": sizeId }]});

            if (!updatedCart) {
                res.status(404).json({ message: "Failed to add product" });
                return
            }

            res.status(200).json({ message: "Cart updated successfully", data: updatedCart });
        }
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}