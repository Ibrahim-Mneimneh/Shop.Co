
import { Request,Response,RequestHandler } from "express";
import Joi from "joi"
import bcrypt from "bcryptjs"
import { UserModel } from "../models/userModel";
import { emailVerification } from "./verificationController";
export interface IRegister{
    email:string,
    password:string,
    firstname:string,
    lastname:string,
    country:string,
    postalCode:number,
    bldngNum:number
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
      address: `${value.country}, ${value.postalCode}, ${value.bldngNum}`,
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
        
        const userData = await UserModel.create(data) 

        // Send email verification
        emailVerification(value.email,value.firstname)
    // send the data back with the token 
    res.status(201).json({message:"User registered Successfully"})

    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
    
}

