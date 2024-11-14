import mongoose, {Document, Schema} from "mongoose"

export interface IOrder extends Document {
    user:mongoose.Schema.Types.ObjectId,
    products: mongoose.Schema.Types.ObjectId[],
    totalPrice:Schema.Types.Decimal128,
    orderStatus:string
}

const userSchema = new Schema<IOrder>({
    user:{ type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    products:[{ type:mongoose.Schema.Types.ObjectId,ref:"product",required:true}],
    totalPrice:{type:Schema.Types.Decimal128,required:true},
    orderStatus:{type:String,default:"Pending",enum:["Pending","In-delivery","Delivered"]}
});

export const UserModel =mongoose.model<IOrder>("Order",userSchema);