import { Request,Response,RequestHandler } from "express";
import Joi from "joi"
import bcrypt from "bcryptjs"


import { UserModel } from "../models/userModel";
import { emailVerification } from "./verificationController";
import { CartModel } from "../models/cartModel";
import { jwtGenerator } from "./authController";


import { Schema } from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
export interface IRegister{
    email:string,
    password:string,
    firstname:string,
    lastname:string,
    country:string,
    postalCode:number,
    bldngNum:number
}
export interface ILogin{
    email:string,
    password:string,
}

const registerSchema = Joi.object<IRegister>({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
  firstname: Joi.string().regex(/^[a-zA-Z\s]+$/).max(15).required().messages({
    'string.regex': 'First name should only contain letters and spaces',
    'string.max': 'First name should not exceed 15 characters',
    'any.required': 'First name is required',
  }),
  lastname: Joi.string().regex(/^[a-zA-Z\s]+$/).max(15).required().messages({
    'string.regex': 'Last name should only contain letters and spaces',
    'string.max': 'Last name should not exceed 15 characters',
    'any.required': 'Last name is required',
  }),
  country: Joi.string().regex(/^[a-zA-Z\s]+$/).required().messages({
    'any.required': 'Country is required',
  }),
  postalCode: Joi.number().required().messages({
    'any.required': 'Postal code is required',
  }),
  bldngNum: Joi.number().required().messages({
    'any.required': 'Building number is required',
  }),
});
const loginSchema= Joi.object<ILogin>({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
})

export const registerUser = async (req: Request, res: Response)=>{
    try{
        const { error, value } = registerSchema.validate(req.body);

    // If the data is invalid
    if (error) {
      res.status(400).json({ message: 'Validation failed', errors: error.details });
      return
    }
    // Reformat data 
    let data = {
      name: value.firstname + ' ' + value.lastname, 
      address: `${value.country},${value.postalCode},${value.bldngNum}`,
      email: value.email,
      password: value.password,
    };

    
        // Check if the email is used
        const usedEmail = await UserModel.findOne({ email:data.email });
        if(usedEmail){
            res.status(400).json({message:"Email already in use"});
            return
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword= await bcrypt.hash(data.password,salt)
        data.password = hashedPassword;
        
        const user = await UserModel.create(data) 

        // Send email verification
        emailVerification(user,value.email,value.firstname)

        // Create a cart for this user
        await CartModel.create({user:user._id})

    // send the data back with the token 
    res.status(201).json({message:"User registered Successfully"})

    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
    
}


export const loginUser = async (req:Request,res:Response)=>{
  try{
    // I need to require the data from the user 
    const { error, value } = loginSchema.validate(req.body);
    if(error){
      res.status(400).json({ message: 'Validation failed', errors: error.details });
        return
    } 

    // check if the user is available 
    const user = await UserModel.findOne({email:value.email})
    if(!user){
      res.status(404).json({ message: "User not found"});
        return
    }
    // check if the user is verified
    if(!user.isVerified){
      if(user.verificationTokenExpiresAt && new Date(user.verificationTokenExpiresAt)<new Date()){
        emailVerification(user,user.email,user.name.split(" ")[0])
        res.status(403).json({
        message: 'Your verification token has expired. Please check your email for a new verification link.'});
        return
      }else{
        res.status(403).json({
        message: 'Your account is not verified. Please check your email to verify your account.'});
        return
      }
    }
    // get password unhash it and check if the password is true 
    const match = await bcrypt.compare(value.password,user.password)

    if(!match){
      res.status(400).json({ message: "Incorrect email/password"});
        return
    }
    // generate the user token (JWT)
    const token:string =jwtGenerator(user._id as Schema.Types.ObjectId,user.passwordChangedAt? user.passwordChangedAt.toISOString():"",user.cart as  Schema.Types.ObjectId )

    res.status(200).json({message:"Login successful",data:user,token}) 
  }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
}

}

export const getUser = async (req:AuthRequest, res:Response)=>{
  try{
    const userId = req.userId
    const userData = await UserModel.findById(userId)
    if(!userData){
      res.status(404).json({message:"User not found"})
      return
    }
    res.status(200).json({message:"User found Successfully",data:userData})

  }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
  }
}