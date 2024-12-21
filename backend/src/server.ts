import express, { Request, Response,Application } from 'express';
import dotenv from "dotenv"
import mongoose from 'mongoose';
import clc from "cli-color"
import {engine} from "express-handlebars"
import path from 'path';
import cron from "node-cron"

import { userRouter } from './routes/userRoutes';
import { authRouter} from "./routes/authRoutes"
import { adminRoutes } from './routes/adminRoute';
import { publicRouter } from './routes/publicRoutes';
import { EndSaleModel, StartSaleModel } from './models/product/productSale';
import { ProductVariantModel } from './models/product/productVariantModel';
import { IObjectId } from './types/modalTypes';


dotenv.config({ path: __dirname + '/.env' });
const app: Application = express();
const PORT = process.env.PORT || 4004



// Set the view engine to Handlebars
app.engine('handlebars', engine());
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, '../public')));

// Limiting JSON size
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(async(req: Request, res: Response, next: Function) => {
  const timestamp = new Date().toISOString(); // Current timestamp
  const method = req.method; // HTTP method (GET, POST, etc.)
  const path = req.path; // Request path
  const ip = req.ip; // IP address
  const userAgent = req.get('User-Agent'); // (browser info)

  // Log the request information
  console.log(`[${timestamp}] ${clc.green(method)} ${path}`);

  // Pass control to the next middleware or route handler
  next();
});

// Routes
app.use("/api/"+process.env.VERSION+"/public", publicRouter);
app.use("/api/"+process.env.VERSION+"/user", userRouter);
app.use("/api/"+process.env.VERSION+"/auth", authRouter);
app.use("/api/"+process.env.VERSION+"/admin",adminRoutes)

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
});

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('Successfully connected to Database!'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

app.listen(PORT, () => {
  console.log(`Server is running at http://${process.env.HOST}:${PORT}`);
});

cron.schedule('1 * * * *',async()=>{
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

})


export default app