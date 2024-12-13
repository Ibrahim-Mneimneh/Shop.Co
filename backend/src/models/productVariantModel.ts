import mongoose,{ Document, Model, Schema,Types } from "mongoose";
import { IObjectId } from "../types/modalTypes";
import { ProductImageModel } from "./productImageModel";
import { console } from "inspector";

export interface IQuantity {
  size: string;
  quantityLeft: number;
}

export interface IProductVariant extends Document{
  _id:Types.ObjectId,
  color:string,
  quantity:IQuantity[],
  images: Types.ObjectId[];
  originalPrice: Number;
  isOnSale: boolean;
  saleOptions?: {
    startDate: Date;
    endDate: Date;
    discountPercentage: number;
    }
}
interface IProductVariantModel extends Model<IProductVariant>{
  addVariant(variant:IProductVariant):Promise<{success:boolean,productVariantId?:IObjectId,errorMessage:string}>
}

const productVariantSchema = new Schema<IProductVariant>({
    quantity: [{
        size: {type: String, required: true, enum: ["XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size"]},
        quantityLeft: { type: Number, required: true, default: 0, min:[0,"Quantity cannot be negative"]}}],
    images: [{ type: Schema.Types.ObjectId,ref:"ProductImage"}],
    color:{type:String,unique:true,required:true},
    originalPrice:{ type: Number,required: true,min: [0,"Price cannot be negative"], },
            isOnSale: {type:Boolean,default:false},
            saleOptions: {type:{
                startDate: { type: Schema.Types.Date, required: true },
                endDate: { type: Schema.Types.Date, required: true },
                discountPercentage: { type: Number, min: 1, max: 99 }},validate: {validator: function (this: IProductVariant) {
                    if (this.isOnSale) {
                        return (this.saleOptions && this.saleOptions.endDate > this.saleOptions.startDate);
                    }
                    return !this.saleOptions;
                    },
                    message: "saleOptions must have valid dates when isOnSale is true.",},}
                
},{timestamps:true});

productVariantSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.createdAt
    delete ret.updatedAt
    delete ret.__v
    return ret
}});

productVariantSchema.statics.addVariant= async function(variant:IProductVariant):Promise<{success:boolean,productVariantId?:IObjectId,errorMessage:string}>{
  try{  
    // convert imageIds to ObjectId exclude duplicate images from linking
    const imageIds:IObjectId[]=[...new Set(variant.images)].map(imageId=>(new Types.ObjectId(imageId)))
    console.log("FilteredImages:" +imageIds)
    // Check images first
    let imageIdsToLink:IObjectId[]=[] 
    const variantImageError = (await Promise.all(imageIds.map( async (imageId,index)=>{
      const imageData = await ProductImageModel.findById(imageId)
      if(!imageData){
        return `Image at index ${index} is invalid`
      }
      if(imageData && !imageData.isLinked){
        imageIdsToLink.push(imageId) 
      }
      return null
    }))).filter((errorMessage)=>errorMessage!==null)
    if(variantImageError.length>0){
      return {success:false,errorMessage:variantImageError.join(", ")}
    }
    // Add product variant 
    const productVariant:IProductVariant = await this.create(variant)
    if(!productVariant){
      return {success:false,errorMessage:"Failed to add product variant"}
    }

    // link images if needed
    if(imageIdsToLink && imageIdsToLink.length>0){
      const linkedImage:{success:boolean,errorMessage:string}= await ProductImageModel.linkImages(imageIdsToLink)
      if(!linkedImage.success){
        return {success:false,errorMessage:linkedImage.errorMessage}
      }
    }

    return {success:true,productVariantId:productVariant._id,errorMessage:""}
  }catch(error:any){
    console.log("Add variant : "+error)
    throw new Error('Error adding variant: ' + error.message);
  }
}

// Deals with updating quantity weather it is 
productVariantSchema.statics.updateQuantity = async function(operation:"restock"|"buy",stock:{variant:IObjectId,details:{size:string,quantity:number}[]}[]):Promise<{success:boolean, errorMessage:string}>{
  try{
    // Check for the type of operation
    if(operation==="restock"){
      for (const element of stock){
        const ElementOperations= element.details.map(detail=>{
          const {size, quantity}= detail
          return {
            updateOne: {
              filter:{_id:element.variant,'quantity.size':size},
              update:{$inc:{'quantity.$.quantityLeft':quantity}},
              upsert:true
            }
          }
        });

        // Update variant's quantity
        const variantResult = await this.bulkWrite(ElementOperations)
        if(variantResult.modifiedCount!==element.details.length){
          return {success:false,errorMessage:"Product partially updated"} // left here 
        }
      }
      return {success:true,errorMessage:""}
    }else{
      
      
      return {success:true,errorMessage:""}
    }
    // Depending on the type of operation we either add or subtract the quantity

    // Case of restock we need to ensure that we use addition by updateBatch and ensure that all are updated, we send the update count if possible if not just add them up in the frontend
    
    // Case of buy we need to ensure that the number that the customer requires matches the one that is available (for looping) after which each one is valid we update them all 

  }catch(error:any){
    console.log("Add variant : "+error)
    throw new Error('Error adding variant: ' + error.message);
  }
}

export const ProductVariantModel =mongoose.model<IProductVariant
,IProductVariantModel>("ProductVariant",productVariantSchema);