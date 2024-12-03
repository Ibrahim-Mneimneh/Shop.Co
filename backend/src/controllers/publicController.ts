import { Request,RequestHandler,Response } from "express";
import { IObjectId } from "../types/modalTypes";
import mongoose from "mongoose";
import { ProductImageModel } from "../models/productImageModel";

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