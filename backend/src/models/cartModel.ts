import mongoose, {Document,Types, Schema} from "mongoose"

import { IProductRef } from "../types/modalTypes";


export interface ICart extends Document {
    _id:Types.ObjectId,
    user:Types.ObjectId,
    products:IProductRef[],
}


const cartSchema = new Schema<ICart>({
    user:{type: Schema.Types.ObjectId, ref: 'User',required:true},
    products:[{
        variant:{type:Schema.Types.ObjectId,ref:"ProductVariant",required:true},
        quantity:[{
            quantity:{type:Number,required:true,min:[1,"Quantity must be at least 1"]},
            size:{type: String, required: true, enum: ["XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size"]},
        
        }]
    }],
});


cartSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret._id
    delete ret.user
    return
}});


export const CartModel =mongoose.model<ICart>("Cart",cartSchema);