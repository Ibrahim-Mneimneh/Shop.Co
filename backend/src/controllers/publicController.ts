import { Request,RequestHandler,Response } from "express";
import { IObjectId } from "../types/modalTypes";
import mongoose, { Types } from "mongoose";
import { ProductImageModel } from "../models/productImageModel";
import { ProductModel } from "../models/productModel"

export const getImage:RequestHandler = async (req:Request,res:Response)=>{
    try{
        const imageIdString:string = req.params.imageId
        // Check format 
        if(!mongoose.Types.ObjectId.isValid(imageIdString)){
            res.status(400).json({message:"Invalid image ID format"})
            return
        }
        // convert to objectId
        const ImageId:IObjectId = new mongoose.Types.ObjectId(imageIdString)

        const image = await ProductImageModel.findById(ImageId)
        if(!image){
            res.status(404).json({message:"Image not found"})
            return
        }
        res.setHeader("Content-Type", "image/"+image.type);
        const imageBuffer = Buffer.from(image.image, "base64");
        res.send(imageBuffer);
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// View products (with filters)

// View product
export const getProduct = async (req:Request,res:Response)=>{
  try{
        // get id prom params
        const isValidProductId:boolean = Types.ObjectId.isValid(req.params.productId)
        if(!isValidProductId){
            res.status(404).json({message:"Invalid ProductId in URL"})
            return
        }
        const productId:IObjectId= new mongoose.Types.ObjectId(req.params.productId)
        // fetch for the product & variants
        const variant = await ProductModel.getVariants(productId) 
        if(variant.success && variant.productVariant && variant.product){
            const product = variant.product.toJSON();
            const productData = { ...product, variants: variant.productVariant };
            res.status(200).json({message:"Product details sent successfully",data:productData})
            return 
        }
        res.status(400).json({message:variant.errorMessage})  
  }catch(error){
        console.log("Get product -"+error)
        res.status(500).json({message:"Server Error"})
  }
}