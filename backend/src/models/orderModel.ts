import mongoose, {Document, Schema} from "mongoose"

export interface IOrder extends Document {
    user:mongoose.Schema.Types.ObjectId,
    products: mongoose.Schema.Types.ObjectId[],

}

const userSchema = new Schema<IOrder>({
    user:{ type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    products:[{ type:mongoose.Schema.Types.ObjectId,ref:"product",required:true}],

});

export const UserModel =mongoose.model<IOrder>("Order",userSchema);