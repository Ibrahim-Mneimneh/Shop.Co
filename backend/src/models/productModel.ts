import mongoose, {Document, Schema} from "mongoose"


export interface IProduct extends Document {
    name:string,
    description:string,
    gender:String,
    category:String
    rating:Number,
    variants:Schema.Types.ObjectId[],
}


const productSchema = new Schema<IProduct>({
    name:{type:String,required:true},
    description:{type:String, maxlength:600},
    gender:{type:String,enum:["male","female","unisex"],required:true},
    category:{type:String,enum:["Jackets","Pullover","Shoes","Suits","Pants","T-Shirts","Accessories"],required:true},
    rating:{type:Number,default:0.0,min:0.0,max:5.0},
    variants:[{type:Schema.Types.ObjectId,required:true}],
},{timestamps:true});



productSchema.index({ gender: 1 });
productSchema.index({ category: 1 });
productSchema.index({ rating: 1 });


export const ProductModel =mongoose.model<IProduct
>("Product",productSchema);