import mongoose, {Document,Types,Schema, Model} from "mongoose"
import { IObjectId } from "../types/modalTypes";

export interface IProduct extends Document {
    _id:Types.ObjectId,
    name:string,
    description:string,
    gender:String,
    category:String
    rating:Number,
    variants:Types.ObjectId[],
    expiresAt?:Date
}

export interface IProductModel extends Model<IProduct>{
  removeExpiry(productId:IObjectId,variantIds:IObjectId[]):Promise<{success:boolean, errorMessage:string}>
}

const productSchema = new Schema<IProduct>({
    name:{type:String,required:true},
    description:{type:String, maxlength:600,required:true},
    gender:{type:String,enum:["Male","Female","Unisex"],required:true},
    category:{type:String,enum:["Jackets","Pullover","Suits","Pants","T-Shirts","Accessories"],required:true},
    rating:{type:Number,default:0.0,min:0.0,max:5.0},
    variants:[{type:Schema.ObjectId,ref:"ProductVariant"}],
    expiresAt:{type:Date,default: new Date(Date.now() + 15 * 60 * 1000),validate:{validator: function(value:Date){
        return this.variants && value
    },message: "Cannot set expiration date for linked products",}}
},{timestamps:true});

productSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.createdAt
    delete ret.__v
    delete ret.updatedAt
    return ret
}});

// Indexing
productSchema.index({ category: 1 });  // category Indexing
productSchema.index({ gender: 1 });    // gender Indexing
productSchema.index({ rating: -1 });    // rating Indexing

// Optional text index for search functionality
productSchema.index({ name: 'text', description: 'text' });

export const ProductModel =mongoose.model<IProduct,IProductModel
>("Product",productSchema);