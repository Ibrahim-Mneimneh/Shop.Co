import mongoose, { Document, Schema, Types } from "mongoose";



interface IStartSale extends Document{
    _id:Types.ObjectId,
    startDate:Date,
    productVariants:Types.ObjectId[],
    isProcessed:boolean,
    expiresAt?:Date
}

interface IEndSale extends Document{
    _id:Types.ObjectId,
    endDate:Date,
    productVariants:Types.ObjectId[],
    isProcessed:boolean,
    expiresAt?:Date
}

const startSaleSchema= new Schema<IStartSale>({
    startDate: {type:Date,required:true,unique:true,validate:{validator:
        function(value){
           return value > new Date() 
        },message: 'startDate must be in the future.',}
    },
    productVariants:[{type:Schema.Types.ObjectId,ref:"ProductVariant"}],
    isProcessed:{type:Boolean,default:false},
    expiresAt:{type:Date}
})

const endSaleSchema= new Schema<IEndSale>({
    endDate: {type:Date,required:true,unique:true,validate:{validator:
        function(value){
           return value > new Date()
        },message: 'endDate must be in the future.',}
    },
    productVariants:[{type:Schema.Types.ObjectId,ref:"ProductVariant"}],
    isProcessed:{type:Boolean,default:false},
    expiresAt:{type:Date}
})

// TTL
startSaleSchema.index({expiresAt: 1 },{ expireAfterSeconds: 0 })
endSaleSchema.index({expiresAt: 1 },{ expireAfterSeconds: 0 })

// Indexed for faster Query
startSaleSchema.index({startDate:1})
endSaleSchema.index({endDate:1})

export const StartSaleModel =mongoose.model<IStartSale>("StartSale",startSaleSchema);
export const EndSaleModel =mongoose.model<IEndSale>("EndSale",endSaleSchema);
