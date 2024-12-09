import mongoose, {Document,Types, Schema} from "mongoose"

import { IObjectId, IProductRef } from "../types/modalTypes";

export interface IOrder extends Document {
    _id:Types.ObjectId,
    user:IObjectId,
    products: IProductRef,
    totalPrice:number,
    orderStatus:string
}

const orderSchema = new Schema<IOrder>({
    user:{ type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    products:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},quantity:{type: Number, required: true,},
    price:{ type: Number, required: true,}
    }],
    totalPrice:{type:Number,required:true,},
    orderStatus:{type:String,default:"Pending",enum:["Pending","In-delivery","Delivered"]}
},{timestamps:true});

orderSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.user
    return ret
}});

export const OrderModel =mongoose.model<IOrder>("Order",orderSchema);