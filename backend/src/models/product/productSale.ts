import mongoose, { Document, Schema, Types } from "mongoose";
import { ProductVariantModel } from "./productVariantModel";



interface IStartSale extends Document{
    startDate:Date,
    productVariants:Types.ObjectId[]
}

interface IEndSale extends Document{
    endDate:Date,
    productVariants:Types.ObjectId[]
}

const startSaleSchema= new Schema<IStartSale>({
    startDate: {type:Date,required:true,validate:{validator:
        function(value){
           return value > new Date() 
        },message: 'startDate must be in the future.',}
    },
    productVariants:[{type:Schema.Types.ObjectId,ref:"ProductVariant"}]
})

const endSaleSchema= new Schema<IEndSale>({
    endDate: {type:Date,required:true,validate:{validator:
        function(value){
           return value > new Date()
        },message: 'endDate must be in the future.',}
    },
    productVariants:[{type:Schema.Types.ObjectId,ref:"ProductVariant"}]
})

export const StartSaleModel =mongoose.model<IStartSale>("StartSale",startSaleSchema);
export const EndSaleModel =mongoose.model<IEndSale>("EndSale",endSaleSchema);

