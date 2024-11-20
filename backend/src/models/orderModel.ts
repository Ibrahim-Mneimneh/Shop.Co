import mongoose, {Document, Schema} from "mongoose"
import { IProductRef } from "../types/modalTypes";

import { decimal128ToNumber,numberToDecimal128 } from "../types/modalTypes";
export interface IOrder extends Document {
    user:mongoose.Schema.Types.ObjectId,
    products: IProductRef,
    totalPrice:Schema.Types.Decimal128,
    orderStatus:string
}

const orderSchema = new Schema<IOrder>({
    user:{ type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    products:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},quantity:{type: Number, required: true,},
    price:{ type: Schema.Types.Decimal128, required: true, get:decimal128ToNumber, set: numberToDecimal128}
    }],
    totalPrice:{type:Schema.Types.Decimal128,required:true,get:decimal128ToNumber, set: numberToDecimal128},
    orderStatus:{type:String,default:"Pending",enum:["Pending","In-delivery","Delivered"]}
},{timestamps:true});

orderSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret._id
    delete ret.user
    return ret
}});



export const OrderModel =mongoose.model<IOrder>("Order",orderSchema);