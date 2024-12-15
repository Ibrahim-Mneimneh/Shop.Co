import { Request, RequestHandler, Response, } from "express";
import bcrypt from "bcryptjs"
import mongoose, { Types } from "mongoose";


import { loginSchema } from "./userController";
import { UserModel } from "../models/userModel";
import { jwtGenerator } from "./authController";
import { IObjectId } from "../types/modalTypes";
import { AuthRequest } from "../middleware/authMiddleware";
import { IBase64Image, IIsValidBase64, isValidBase64, IUpdateStock } from "../types/adminControllerTypes";
import { ProductImageModel } from "../models/productImageModel";
import { IProduct, ProductModel } from "../models/productModel";
import { addProductSchema, addProductVariantSchema, saleOptionsSchema, updateQuantitySchema } from "../types/productTypes";
import { IProductVariant, ProductVariantModel } from "../models/productVariantModel";
import { DbSessionRequest } from "../middleware/sessionMiddleware";


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

// ***************************** UPDATE FOR LATER (works on products that exist too)
export const addProductVariant:RequestHandler = async (req:AuthRequest,res:Response)=>{
    try{
        // get productId from params
        const isValidProductId:boolean = Types.ObjectId.isValid(req.params.productId)
        if(!isValidProductId){
            res.status(404).json({message:"Invalid ProductId in URL"})
            return
        }
        // get product details
        const data:{variants:IProductVariant[]} =  req.body
        // validate productDetails
        const { error, value } = addProductVariantSchema.validate(data);
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        // check if product exists and if it already has variants
        const productId:IObjectId= new mongoose.Types.ObjectId(req.params.productId)
        const product =await ProductModel.findById(productId)
        if(!product){
            res.status(404).json({message:"Product not found"})
            return
        }
        if(product.variants.length>0){
            res.status(400).json({message:"Product variants already exist"})
            return
        }
        const variantIds:IObjectId[]= []
        // add variants and check their images & remove their expiry (link them)
        const addVariantError:string[]= []
        for (let index = 0; index < data.variants.length; index++) {
            const variant = data.variants[index];
            const {success, productVariantId, errorMessage} = await ProductVariantModel.addVariant(variant);
            if (!success) {
                addVariantError.push(`Product addition at index ${index} failed, ( ${errorMessage} )`);
            } else {
                variantIds.push(productVariantId as IObjectId);
            }
        }
        if(addVariantError.length>0){
            res.status(400).json({message:"Invalid product:"+ addVariantError.join(", ")})
            return 
        }
        // remove expiry and update product at once 
        const {success,errorMessage}= await ProductModel.removeExpiry(productId,variantIds)
        if(!success){
            res.status(400).json({message:"Invalid product:"+ errorMessage})
            return 
        }
        res.status(200).json({message:"Product variants added successfully"})
    }catch(error){
    console.log(error)
    res.status(500).json({message:"Server Error"})
    }
}
// Update or delete a Sale
export const updateVariantSale = async (req:Request,res:Response)=>{
    try{
        const isValidProductVarId:boolean = Types.ObjectId.isValid(req.params.variantId)
        if(!isValidProductVarId){
            res.status(404).json({message:"Invalid ProductId in URL"})
            return
        }
        const productVarId:IObjectId= new mongoose.Types.ObjectId(req.params.variantId)
        // fetch for the product 
        const product = await ProductVariantModel.findById(productVarId)
        if(!product){
            res.status(404).json({message:"Product not found"})
            return
        }
        const data:{startDate:Date, endDate:Date, discountPercentage:number} =  req.body


        // if there is no data its delete 
        if(!data || Object.keys(data).length === 0){

            // if the product is on sale its then reset it
            if(product.isOnSale){
                product.isOnSale=false
                product.saleOptions=undefined
                await product.save();
                res.status(200).json({ message: "Sale deleted successfully" });
                return 
            }else{ // if its not then send its already set 
                res.status(400).json({message:"Validation failed: 'discountPercentage','startDate' and 'endDate' attributes are required to update sale"})
            }


        }else{
            // ensure the data is in the right format
            const { error,value } = saleOptionsSchema.validate(data);
            if(error){
                res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
                return
            }
            const {startDate,endDate,discountPercentage}=value
            if(product.isOnSale && product.saleOptions){ // update the sale 
                // if the new startDate is before the old startdate then set the one that is before
                const currentSale = product.saleOptions;

                const currentDate =new Date(Date.now())
                if( startDate<product.saleOptions.startDate){
                    currentSale.startDate=startDate
                }
                // if the new endDate is larger than the old endDate we expand
                if( endDate>product.saleOptions.endDate ){
                    currentSale.endDate=endDate
                }
                // keep the ability to modify percentage  
                currentSale.discountPercentage=discountPercentage
                await product.save()
                res.status(200).json({message:"Sale updated successfully"})
                return 
            }else{ // start sale 
                product.isOnSale=true
                product.saleOptions={startDate,endDate,discountPercentage}
                await product.save()
                res.status(200).json({message:"Sale created successfully"})
                return 
            }
        }
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Update Variant stock (Add items) {size, quantity}
export const restockProduct = async (req:DbSessionRequest,res:Response)=>{
    try{
        // get product Id
        const isValidProductId:boolean = Types.ObjectId.isValid(req.params.productId)
        if(!isValidProductId){
            res.status(404).json({message:"Invalid ProductId in URL"})
            return
        }
        const productId:IObjectId= new mongoose.Types.ObjectId(req.params.productId)
        // fetch for the product 
        const product = await ProductModel.findById(productId)
        if(!product){
            res.status(404).json({message:"Product not found"})
            return
        }
        const data:{stock:{variant:string,details:{size:string,quantity:number}[]}[]} =  req.body
        // validate productDetails
        const { error, value } = updateQuantitySchema.validate(data);
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        // ensure the variants belong to the same product & change type
        const stock:IUpdateStock[]=value.stock
        const variantIdError=stock.map((stockElement)=>{
            const variantId:IObjectId= new mongoose.Types.ObjectId(stockElement.variant)
            if(!product.variants.includes(variantId)){ //if it doesn't belongs to same product
                return `Invalid product variant: ${stockElement.variant}` 
            }
            stockElement.variant=variantId // update to objectId
            return null
        }).filter(errorMessage => errorMessage !== null)
        if(variantIdError.length>0){
            res.status(400).json({message:"Invalid product variants"})
            return
        }
        const {success,errorMessage}= await ProductVariantModel.updateQuantity("restock",stock,req.dbSession as mongoose.ClientSession)
        if(!success){
            res.status(400).json({message:`Failed to restock '${product.name}' of id: ${errorMessage}`})
            return
        }
        res.status(200).json({message:"Product successfully restocked"})
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Delete a product

// View sales

// View purchaces

// Change order status

// Get out of stock products

