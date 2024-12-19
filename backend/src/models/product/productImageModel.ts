import mongoose,{Document,Model,Schema,Types} from "mongoose";
import { ClientSession, IObjectId } from "../../types/modalTypes";
import { IBase64Image } from "../../types/adminControllerTypes";

export interface IProductImage extends Document{
    _id:Types.ObjectId,
    image:string,
    type:string,
    isLinked:boolean,
    expiresAt?:Date,
}


interface IProductImageModel extends Model<IProductImage> {
  linkImages(images: IObjectId[],session:ClientSession): Promise<{success:boolean,errorMessage:string}>;
  saveBatch(base64Images:IBase64Image[],session:ClientSession):Promise<{success: boolean,imageIds:string[],errorMessage:string}>
}

const ProductImageSchema = new Schema<IProductImage>({
    image:{type:String, required:true,},
    type:{type:String,enum:["jpeg","png","jpg"]},
    isLinked:{type:Boolean, default:false},
    expiresAt:{type:Date,default: new Date(Date.now() + 5 * 60 * 1000) ,validate:{validator: function(value:Date){
        return !(this.isLinked && value)
    },message: "Cannot set expiration date for linked images",}}
})

ProductImageSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.createdAt
    delete ret.updatedAt
    delete ret.__v
    return ret
}});

ProductImageSchema.statics.linkImages= async function(imageIds:IObjectId[],session:mongoose.ClientSession):Promise<{success:boolean,errorMessage:string,}>{
    try{
        if(!imageIds || imageIds.length===0)
            return {success:false,errorMessage:"Failed to link images: No images selected."}
        // ensure there is no duplicates
        const operations = imageIds.map((imageId:IObjectId)=>(
            {updateOne:{
                filter:{_id:imageId},
                update:{$set:{isLinked:true},$unset:{expiresAt:null}},
                upsert:false
            }}
        ))
        // Update multiple images
        const result = await this.bulkWrite(operations,{session})
        if (!result) {
            return {success:false,errorMessage:"Failed to link images: No images were updated."};
        }

        // Handle partial success
        if (result.modifiedCount < imageIds.length) {
            const failedCount = imageIds.length - result.modifiedCount;
            return {success:false, errorMessage:`Try again: Failed to link ${failedCount} images`};
        }
        return {success:true,errorMessage:""}
    }
    catch(error:any){
        console.log("LinkImages - "+error)
        throw new Error('Error linking images: ' + error.message);
    }
}

ProductImageSchema.statics.saveBatch= async function(base64Images:IBase64Image[],session:ClientSession):Promise<{success: boolean,imageIds:string[],errorMessage:string}>{
    try{
        const operations = base64Images.map((base64Image) => ({
        insertOne: {
            document: { image:base64Image.content,type:base64Image.type }
        }
        }));
        const result = await this.bulkWrite(operations,{session});
        if(!result){
            return {success:false,imageIds:[],errorMessage:"Failed to save images"}
        }
        const savedImageIds:string[]=Object.values(result.insertedIds).map(id => id.toString());
        const success:boolean = result.insertedCount === base64Images.length;
        return {success,imageIds:savedImageIds,errorMessage:""}
    }catch(error:any){
        console.log("saveBatch - "+error)
        throw new Error('Error linking images: ' + error.message);
    }
}

ProductImageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ProductImageModel =mongoose.model<IProductImage,IProductImageModel>("ProductImage",ProductImageSchema);