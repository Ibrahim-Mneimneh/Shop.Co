import mongoose from "mongoose"
import clc from "cli-color";

import { StartSaleModel } from "../models/product/productSale"
import { EndSaleModel } from "../models/product/productSale"
import { ProductVariantModel } from "../models/product/productVariantModel"
import { IObjectId } from "../types/modalTypes"

export const SaleHandler=async()=>{
  const currentDate:Date = new Date()

  const startSaleDocs = await StartSaleModel.find({
    startDate:{ // get endDates that start before currentTime
      $lte: new Date(currentDate.getTime())
    },
    isProcessed: { $ne: true }
  })

  const endSaleDocs = await EndSaleModel.find({
    endDate:{ // get endDates that end before currentTime
      $lte: new Date(currentDate.getTime())
    },
    isProcessed: { $ne: true }
  })
  // check if there is an update 
  if (startSaleDocs.length>0 || endSaleDocs.length>0){
    const session = await mongoose.startSession();
    session.startTransaction();
    try{

      if (startSaleDocs.length > 0) {
        const startSaleIds:IObjectId[]=[]
        const startOps = startSaleDocs.map(startSale => {
          startSaleIds.push(startSale._id)
          return{
            updateMany: {
              filter: { _id: { $in: startSale.productVariants } },
              update: { $set: { isOnSale: true } },
            }
          }
        })

        const result = await ProductVariantModel.bulkWrite(startOps,{session})
        if (result.ok !== 1) {
          throw new Error('StartDate Bulk write operation failed');
        }
        if(result.modifiedCount!==startOps.length){
          throw new Error('StartDate Bulk write operation failed to update all productVariants');
        }
        // Update start to activate TTL
        const startSaleUpdateResult = await StartSaleModel.updateMany({_id:{$in:startSaleIds}},[{$set:{isProcessed:true,expiresAt:'$startDate'}}],{session} )
        if ( !startSaleUpdateResult.acknowledged || startSaleUpdateResult.matchedCount !== startSaleIds.length ){
          throw new Error('StartDate update operation failed');
        }

      }

      if (endSaleDocs.length > 0) {
        const endSaleIds:IObjectId[]=[]
        const endOps = endSaleDocs.map(endSale => {
          endSaleIds.push(endSale._id)
          return {
            updateMany: {
              filter: { _id: { $in: endSale.productVariants } },
              update: { $set: { isOnSale: false }, $unset:{saleOptions:null} },
            },
          }
        })

        const result = await ProductVariantModel.bulkWrite(endOps,{session})
        if (result.ok !== 1) {
          throw new Error('StartDate Bulk write operation failed');
        }
        if(result.modifiedCount!==endOps.length){
          throw new Error('StartDate Bulk write operation failed to update all productVariants');
        }

        // Update start to activate TTL
        const endSaleUpdateResult = await EndSaleModel.updateMany({_id:{$in:endSaleIds}},[{$set:{isProcessed:true,expiresAt:'$endDate'}}],{session} )
        if ( !endSaleUpdateResult.acknowledged || endSaleUpdateResult.matchedCount !== endSaleIds.length ){
          throw new Error('EndDate update operation failed');
        }
      }
      await session.commitTransaction();
      session.endSession();
      console.log(clc.green("Cron ran successfully") )
    }catch(error){
      await session.abortTransaction();
      session.endSession();
      console.error(clc.redBright('StartDate or EndDate Transaction failed, changes rolled back:'), error);
    }
  }

}