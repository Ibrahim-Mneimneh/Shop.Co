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

StartSaleModel.watch().on("change", async(change)=>{

    if(change.operation=== "insert"){
        const startSale:IStartSale = change.fullDocument;
        const currentDate:Date = new Date()
        const startDate:Date = startSale.startDate
        const delayInMilliseconds:number = startDate.getTime() - currentDate.getTime() - 1000
        setTimeout(async ()=>{
            const session = await mongoose.startSession();
            session.startTransaction();
            const {productVariants}=startSale
            try{
                const operations = productVariants.map((productVariant)=>{
                    return {
                        updateOne:{
                            filter:{_id:productVariant},
                            update:{
                                $set:{isOnSale:true},
                            }
                        }
                    }
                })

                const result = await ProductVariantModel.bulkWrite(operations, { session });

                if (result.ok !== 1) {
                    throw new Error('StartDate Bulk write operation failed');
                }
                if(result.modifiedCount!==productVariants.length){
                    throw new Error('StartDate Bulk write operation failed to update all productVariants');
                }
                await session.commitTransaction();
                session.endSession();
            }catch(error){
                await session.abortTransaction();
                session.endSession();
                console.error('StartDate Transaction failed, changes rolled back:', error);
            }
        },delayInMilliseconds)
    }
})


EndSaleModel.watch().on("change", async(change)=>{

    if(change.operation=== "insert"){
        const endSale:IEndSale = change.fullDocument;
        const currentDate:Date = new Date()
        const endDate:Date = endSale.endDate
        const delayInMilliseconds:number = endDate.getTime() - currentDate.getTime() - 1000
        setTimeout(async ()=>{
            const session = await mongoose.startSession();
            session.startTransaction();
            const {productVariants}=startSale
            try{
                const operations = productVariants.map((productVariant)=>{
                    return {
                        updateOne:{
                            filter:{_id:productVariant},
                            update:{
                                $set:{isOnSale:true},
                            }
                        }
                    }
                })

                const result = await ProductVariantModel.bulkWrite(operations, { session });

                if (result.ok !== 1) {
                    throw new Error('StartDate Bulk write operation failed');
                }
                if(result.modifiedCount!==productVariants.length){
                    throw new Error('StartDate Bulk write operation failed to update all productVariants');
                }
                await session.commitTransaction();
                session.endSession();  
            }catch(error){
                await session.abortTransaction();
                session.endSession();
                console.error('StartDate Transaction failed, changes rolled back:', error);
            }
        },delayInMilliseconds)
    }
})