import { Request, RequestHandler, Response, } from "express";
import bcrypt from "bcryptjs"


import { loginSchema } from "./userController";
import { UserModel } from "../models/userModel";
import { jwtGenerator } from "./authController";
import { IObjectId } from "../types/modalTypes";


// Admin login
export const adminLogin = async (req:Request,res:Response)=>{
    try{
        const { error, value } = loginSchema.validate(req.body);
        if(error){
            res.status(400).json({ message: 'Validation failed', errors: error.details });
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

        res.status(200).json({message:"Login Successful",data:user,token}) 

    }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
    }

} 

// Add a product + UPDATE REQUEST TYPE
export const addProduct:RequestHandler = async (req:Request,res:Response)=>{
    try{

        return 
    }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
    }
} 
// Delete a product

// Add discount 

// Remove Discount 

// Update product


// View sales

// View purchaces

// Change order status


