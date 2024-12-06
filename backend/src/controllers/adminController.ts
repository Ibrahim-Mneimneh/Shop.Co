import { Request, RequestHandler, Response, } from "express";
import bcrypt from "bcryptjs"
import mongoose, { Types } from "mongoose";


import { loginSchema } from "./userController";
import { UserModel } from "../models/userModel";
import { jwtGenerator } from "./authController";
import { IObjectId } from "../types/modalTypes";
import { AuthRequest } from "../middleware/authMiddleware";
import { IBase64Image, IIsValidBase64, isValidBase64 } from "../types/adminControllerTypes";
import { ProductImageModel } from "../models/productImageModel";
import { IProduct, ProductModel } from "../models/productModel";
import { addProductSchema, addProductVariantSchema } from "../types/productTypes";
import { IProductVariant, ProductVariantModel } from "../models/productVariantModel";


// Admin login
export const adminLogin:RequestHandler = async (req:Request,res:Response)=>{
    try{
        const { error, value } = loginSchema.validate(req.body);
        if(error){
            res.status(400).json({ message: 'Validation failed: '+ error.details[0].message.replace(/\"/g, '') }) ;
            return
        }

        const user = await UserModel.findOne({email:value.email})
        if(!user){
            res.status(404).json({ message: "User not found"});
            return
        }

        const match = await bcrypt.compare(value.password,user.password)

        if(!match){
        res.status(400).json({ message: "Incorrect email/password"});
            return
        }

        // generate the user token (JWT)
        const token:string =jwtGenerator(user._id as IObjectId,user.passwordChangedAt? user.passwordChangedAt.toISOString():"",undefined,user.role)

        res.status(200).json({message:"Login Successful", data:user,token}) 

    }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
    }

} 

// Upload ProductImages
export const addProductImage:RequestHandler = async (req:AuthRequest,res:Response)=>{
    try{
        const {base64Images}:{base64Images:string[]} = req.body
        // not empty and array 
        if (!base64Images || !Array.isArray(base64Images)) {
            res.status(400).json({ message: "'base64Images' must be an array of strings" });
            return
        }
        // not more than 4 images or less than 1
        if(base64Images.length>4 || base64Images.length<1){
            res.status(400).json({ message: "You must provide between 1 and 4 images" });
            return
        }
        // check images size and  validity
        const base64ImageData:IBase64Image[]=[]

        const invalidImages = base64Images.map((base64Image, index) => {
            const {success,base64ErrorMessage,content,type}:IIsValidBase64=isValidBase64(base64Image)
            if (!success) {
                return `Image at index ${index} is invalid. ${base64ErrorMessage}`;
            }
            // when successful extract content and type
            base64ImageData.push({content,type})
            return null; // Valid
        }).filter((errorMessage) => errorMessage !== null);

        if (invalidImages.length > 0) {
            res.status(400).json({ message: "Validation failed: "+invalidImages.join(", ") });
            return 
        }
        // save images
        const {success,imageIds,errorMessage}:{success:boolean,imageIds:string[],errorMessage:string} = await ProductImageModel.saveBatch(base64ImageData)
        if(!success){
            res.status(400).json({message:errorMessage})
            return
        }
        res.status(200).json({message:"Images added successfully",data:{imageIds}})
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}


// Add a product
export const addProduct:RequestHandler = async (req:AuthRequest,res:Response)=>{
    try{
        // get product details
        const productDetails:IProduct =  req.body
        // validate productDetails
        const { error, value } = addProductSchema.validate(productDetails);
        if(error){
            res.status(400).json({ message: 'Validation failed: '+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        const {name, description,gender,category}=productDetails
        const product = await ProductModel.create({name,description,gender,category})
        if(!product){
            res.status(400).json({message:"Failed to add product"})
            return
        }
        // add variants
        res.status(200).json({message:"Product added successfully", data:product})
    }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
    }
} 

// Delete a product

// Add Product Discount 

// Remove Discount 

// Update product


// View sales

// View purchaces

// Change order status


