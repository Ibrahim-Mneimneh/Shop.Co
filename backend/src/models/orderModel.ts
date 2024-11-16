import mongoose, {Document, Schema} from "mongoose"
import { IProductRef } from "../types/modalTypes";

export interface IOrder extends Document {
    user:mongoose.Schema.Types.ObjectId,
    products: IProductRef,
    totalPrice:Schema.Types.Decimal128,
    orderStatus:string
}

const userSchema = new Schema<IOrder>({
    user:{ type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    products:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},quantity:{type: Number, 
      required: true,},
    price:{ type: Schema.Types.Decimal128,  required: true }
    }],
    totalPrice:{type:Schema.Types.Decimal128,required:true},
    orderStatus:{type:String,default:"Pending",enum:["Pending","In-delivery","Delivered"]}
},{timestamps:true});

export const OrderModel =mongoose.model<IOrder>("Order",userSchema);