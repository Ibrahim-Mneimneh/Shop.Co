import { Request, RequestHandler, Response, } from "express";
import bcrypt from "bcryptjs"

import { UserModel } from "../models/userModel";
import { jwtGenerator } from "./authController";
import { ClientSession, IObjectId, IOrderQuantity, IProductRef } from "../types/modalTypes";
import { AuthRequest } from "../middleware/authMiddleware";
import { IBase64Image, IIsValidBase64, isMoreThanWeekOld, isValidBase64 } from "../types/adminControllerTypes";
import { ProductImageModel } from "../models/product/productImageModel";
import { IProduct, ProductModel } from "../models/product/productModel";
import { addProductSchema, addProductVariantSchema, deleteProductQuerySchema, updateDeliveryStatusSchema, updateQuantitySchema, updateVariantSaleSchema, validIdSchema } from "../types/productTypes";
import { IProductVariant, IQuantity, ProductVariantModel } from "../models/product/productVariantModel";
import { DbSessionRequest } from "../middleware/sessionMiddleware";
import { EndSaleModel, StartSaleModel } from "../models/product/productSale";
import { productIdSchema } from "../types/publicControllerTypes";
import { loginSchema, orderIdSchema } from "../types/userControllerTypes";
import { OrderModel } from "../models/orderModel";


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
export const addProductImage:RequestHandler = async (req:DbSessionRequest,res:Response)=>{
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
        const {success,imageIds,errorMessage}:{success:boolean,imageIds:string[],errorMessage:string} = await ProductImageModel.saveBatch(base64ImageData,req.dbSession as ClientSession)
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
        const {name, description,category,subCategory}=value
        const product = await ProductModel.create({name,description,category,subCategory})
        if(!product){
            res.status(400).json({message:"Failed to add product"})
            return
        }
        res.status(200).json({message:"Product added successfully", data:product})
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
} 

// ***************************** UPDATE FOR LATER (works on products that exist too)
export const addProductVariant:RequestHandler = async (req:DbSessionRequest,res:Response)=>{
    try{
        // validate productDetails
        const { error, value } = addProductVariantSchema.validate({
          variants: req.body.variants,
          productId: req.params.productId,
        });
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        const {productId,variants}:{productId:IObjectId,variants:IProductVariant[]}=value
        // check if product exists and if it already has variants
        const product =await ProductModel.findById(productId)
        if(!product){
            res.status(404).json({message:"Product not found"})
            return
        }
        if(product.status==="Active"){
            res.status(400).json({message:"Product variants already exist"})
            return // ********** Add here
        }
        const variantIds:IObjectId[]= []
        // add variants and check their images & remove their expiry (link them)
        const addVariantError:string[]= []
        for (let index = 0; index < variants.length; index++) {
            const variant = variants[index];
            const {success, productVariantId, errorMessage} = await ProductVariantModel.addVariant(variant,productId,req.dbSession as ClientSession);
            if (!success) {
                addVariantError.push(`Product variant at index: ${index} addition failed ( ${errorMessage} )`);
            } else {
                variantIds.push(productVariantId as IObjectId);
            }
        }
        if(addVariantError.length>0){
            res.status(400).json({message:"Invalid Product: "+ addVariantError.join(", ")})
            return 
        }
        // remove expiry and update product at once 
        const {success,errorMessage}= await ProductModel.removeExpiry(productId,variantIds,req.dbSession as ClientSession)
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
// Update or Add a Sale
export const updateVariantSale = async (req:DbSessionRequest,res:Response)=>{
    try{
        const data:{saleOptions:{startDate?:Date, endDate?:Date, discountPercentage?:number},productVarId:string} = {productVarId:req.params.variantId,saleOptions:req.body }
    
        const { error, value } = updateVariantSaleSchema.validate(data);
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        const session = req.dbSession as ClientSession
        const {productVarId,saleOptions}=value
        const product = await ProductVariantModel.findById(productVarId)
        if(!product){
            res.status(404).json({message:"Product not found"})
            return
        }    

        const {startDate,endDate,discountPercentage}=saleOptions
        // if the product is on sale (allow partial update)
        if( product.saleOptions && product.saleOptions.startDate && product.saleOptions.endDate && product.saleOptions.discountPercentage){
            const currentSale = product.saleOptions;
            if(startDate && startDate!==currentSale.startDate){

                if(!endDate && currentSale.endDate<=startDate){ // ensure endDate>start
                    res.status(400).json({message:"Validation failed: startDate should be earlier than endDate"})
                    return 
                }
                // startSale update; remove prodvarId from old startSale to new one
                const saleUpdateOps = [
                    {updateOne:{
                        filter:{startDate:currentSale.startDate},
                        update:{$pull:{productVariants:productVarId}},
                    }},
                    {updateOne:{
                        filter:{startDate},
                        update:{$addToSet:{productVariants:productVarId}},
                        upsert:true,
                    }}
                ]
                const startSaleUpdate= await StartSaleModel.bulkWrite(saleUpdateOps,{session})
                if(startSaleUpdate.ok !== 1 || startSaleUpdate.hasWriteErrors()){
                    res.status(400).json({message:"Failed to update sale"})
                    return
                }
                // update productVar startDate
                currentSale.startDate=startDate
            }else{ // no startDate
                if(endDate && endDate!==currentSale.endDate){
                    if(!startDate && currentSale.startDate>=endDate){ // Ensure new end > start (old)
                    res.status(400).json({message:"Validation failed: startDate should be earlier than endDate"})
                    return 
                    }
                    // update endSale
                    const saleUpdateOps = [
                        {updateOne:{
                            filter:{endDate:currentSale.endDate},
                            update:{$pull:{productVariants:productVarId}},
                        }},
                        {updateOne:{
                            filter:{endDate:endDate},
                            update:{$addToSet:{productVariants:productVarId}},
                            upsert:true,
                        }}
                    ]
                    const endSaleUpdate= await EndSaleModel.bulkWrite(saleUpdateOps,{session})
                    if(endSaleUpdate.ok !== 1 || endSaleUpdate.hasWriteErrors()){
                        res.status(400).json({message:"Failed to update sale"})
                        return
                    }
                    // update productVar endDate
                    currentSale.endDate=endDate
                }
            }
            // update sale percentage if its given
            if(discountPercentage){
                const salePrice =
                  Math.round(
                    product.originalPrice * (1 - discountPercentage / 100) * 100
                  ) / 100;
                currentSale.discountPercentage=discountPercentage
                currentSale.salePrice = salePrice
            }
            await product.save({session})
            res.status(200).json({message:"Sale updated successfully"})
            return 
        }else{ // Not on sale , Add sale strictly require all 3 attributes
            if(!startDate || !endDate || !discountPercentage){
                res.status(400).json({ message: "Validation failed: 'startDate', 'endDate' & 'discountPercentage' are required"});
                return
            }
            // fetch for start and endDates if not found create one
            const startSale= await StartSaleModel.updateOne({startDate:startDate},{$addToSet:{productVariants:productVarId}},{upsert:true,session})
            const endSale= await EndSaleModel.updateOne({endDate:endDate},{$addToSet:{productVariants:productVarId}},{upsert:true,session})
            if(!startSale.acknowledged || !endSale.acknowledged){
                res.status(400).json({message:"Failed to add sale"})
                return 
            }
            const salePrice =Math.round(
                product.originalPrice * (1 - discountPercentage / 100) * 100
              ) / 100;
            product.saleOptions={startDate,endDate,discountPercentage,salePrice}
            await product.save({session})
            res.status(200).json({message:"Sale created successfully"})
            return 
        }
        
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// delete Variant Sale 
export const deleteVariantSale = async (req:DbSessionRequest,res:Response)=>{
    try{
        const session=req.dbSession
        const {error,value}= validIdSchema.validate(req.params.variantId)
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        const variantId=value
        const variantSaleData= await ProductVariantModel.findById(variantId,{isOnSale:1,saleOptions:1})
        if(!variantSaleData){
            res.status(404).json({message:"Product not found"})
            return
        }
        const {isOnSale,saleOptions}=variantSaleData
        let updatedVrainat:IProductVariant|null=null

        // Variant is is onSale or pending it ("saleOptions is loaded")
        if(saleOptions && saleOptions?.startDate && saleOptions?.endDate){
            const {startDate,endDate}=saleOptions
            if(isOnSale){ // sale started
                const endSaleData = await EndSaleModel.findOneAndUpdate({endDate},{ $pull: { productVariants: variantId } },{session})
                if(!endSaleData){
                    res.status(400).json({message:"Failed to update sale"})
                    return
                }
            }else{ // sale hasn't started
                const startSaleData = await StartSaleModel.findOneAndUpdate({startDate},{ $pull: { productVariants: variantId } },{session})
                const endSaleData = await EndSaleModel.findOneAndUpdate({endDate},{ $pull: { productVariants: variantId } },{session})
                if(!startSaleData || !endSaleData){
                    res.status(400).json({message:"Failed to remove sale"})
                    return
                } 
            }
            // update variant 
            updatedVrainat= await ProductVariantModel.findByIdAndUpdate(variantId,{
                $set:{isOnSale:false,saleOptions:null}
            },{new:true,session})

        }else{ // if there is no sale
            res.status(400).json({message:"Failed to remove sale. Product not on sale"})
            return
        }
        res.status(200).json({message:"Sale removed successfully",data:updatedVrainat})
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Update Variant stock (Add items) {size, quantity}
export const restockProduct = async (req:DbSessionRequest,res:Response)=>{
    try{ 
        // validate productDetails
        const { error, value } = updateQuantitySchema.validate({
          productId: req.params.productId,
          details: req.body,
        });
        if(error){
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        const {productId}:{productId:IObjectId}=value
        const stock:IProductRef[]= value.details.stock

        const product = await ProductModel.findById(productId)
        if(!product){
            res.status(404).json({message:"Product not found"})
            return
        }
        // ensure the variants belong to the same product
        const variantUnavailable=stock.map((stockElement)=>{
          // if it doesn't belongs to same product
          if (!product.variants.includes(stockElement.variant as IObjectId)) {
            return `Invalid variant ${stockElement.variant}`;
          }
          return null;
        }).filter(errorMessage => errorMessage !== null)
        if (variantUnavailable.length > 0) {
          res.status(400).json({ message: "Invalid product variants" });
          return;
        }
        const {success,errorMessage}= await ProductVariantModel.updateQuantity("restock",stock,req.dbSession as ClientSession)
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

// Delete a product with reset stock option
export const deleteProduct = async (req:DbSessionRequest, res:Response)=>{
    try{
        const { error,value} = deleteProductQuerySchema.validate({Id:req.params.productId,clearStock:req.query.clearStock});
        if (error) {
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        // Get validated query parameters
        const { clearStock = 'false',Id:productId } = value
        const session =req.dbSession as ClientSession 
        // soft delete for the product 
        const updatedProduct = await ProductModel.findByIdAndUpdate(productId,{$set:{status:"Inactive"}},{new:true,session})
        if(!updatedProduct){
            res.status(404).json({message:"Product not found"})
            return
        }
        const updateObj:{status:string,quantity?:IQuantity[],stockStatus?:string} ={status: "Inactive"}
        if(clearStock==="true"){
            updateObj.quantity=[]
            updateObj.stockStatus="Out of Stock"
        }
        //update its variants' status and reset their quantity 
        const updatedVariants = await ProductVariantModel.updateMany({_id:{$in:updatedProduct.variants}},{ $set: updateObj },{session})
        if(!updatedVariants){
            res.status(400).json({message:"Failed to delete product"})
            return
        }
        res.status(200).json({message:"Product deleted successfully"})
    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// Delete a variant with reset stock option
export const deleteProductVariant = async (req:DbSessionRequest,res:Response)=>{
    try{
        const { error,value} = deleteProductQuerySchema.validate({Id:req.params.variantId,clearStock:req.query.clearStock});
        if (error) {
            res.status(400).json({ message: "Validation failed: "+ error.details[0].message.replace(/\"/g, '') });
            return
        }
        const { clearStock = 'false',Id:variantId } = value
        const updateObject:{status:string,quantity?:IQuantity[],stockStatus?:string}={status:"Inactive"}
        if(clearStock==="true"){
            updateObject.quantity=[]
            updateObject.stockStatus="Out of Stock"
        }
        // check if it exists and set its status to Inactive and update its product
        const productVarUpdate =await ProductVariantModel.findOneAndUpdate({_id:variantId,status:"Active"},{$set:updateObject})
        if(!productVarUpdate){
            res.status(400).json({message:"Failed to delete product"})
            return
        }
        res.status(200).json({message:"Product variant successfully"})

    }catch(error){
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

// View product & its variants
export const getProduct = async (req: Request, res: Response) => {
  try {
    // get id from params
    const { error, value } = productIdSchema.validate({
      productId: req.params.productId,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    // fetch for the product & variants
    const productDetails = await ProductModel.getVariants(
      value.productId,
      "Active",
      { status: "Active" }
    );
    if (productDetails.success && productDetails.product) {
      const product = productDetails.product;
      res.status(200).json({
        message: "Product details loaded successfully",
        data: product,
      });
      return;
    }
    res.status(400).json({ message: productDetails.errorMessage });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
export const updateDeliveryStatus = async (req:AuthRequest,res:Response)=>{
    try{
    const { error, value } = updateDeliveryStatusSchema.validate({
      orderId: req.params.orderId,
      deliveryStatus:req.body.deliveryStatus
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const {orderId,deliveryStatus}=value
    const orderData = await OrderModel.findOne({_id:orderId,paymentStatus:"Complete"},"deliveryStatus updatedAt")
    if(!orderData){
        res.status(404).json({message:"Order not found"})
        return
    }
    const currentDeliveryStatus = orderData.deliveryStatus
    const {updatedAt} = orderData
    // To allow fixing status in case something goes wrong but with limits
    if(currentDeliveryStatus==="Delivered" && isMoreThanWeekOld(updatedAt)){
        res.status(400).json({ message: "Order already delivered" });
        return;
    }
    // update status
    orderData.deliveryStatus=deliveryStatus
    await orderData.save()

    res.status(200).json({message:"Delivery status successfully updated"});
    }catch(error){
    console.log(error);
    res.status(500).json({ message: "Server Error" });
    }
}
// View sales ** need original Price

// View orders 

// Get out of stock products

// Get Products with filters (even non active) 

// View purchaces

// Change order status

// Get out of stock products

