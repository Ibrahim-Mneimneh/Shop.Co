import mongoose, {Document, Schema} from "mongoose"

export interface IUser extends Document {
    name: string,
    password: string,
    email: string,
    createdAt:Date,
    passwordChangedAt:Date,
    address:string,
    role:string,
    cart:mongoose.Schema.Types.ObjectId,
    orders:mongoose.Schema.Types.ObjectId[]
}

const userSchema = new Schema<IUser>({
    name:{type:String,required:true},
    password:{ type:String,required:true,},
    email: { type: String, required: true, unique: true },
    role:{type: String,
      default: "user",
      enum: ["admin", "user"],
    },
    createdAt:{type:Date, required:true},
    passwordChangedAt:{type:Date, required:true},
    address:{type:String,required:true},
    orders:[{
        type: mongoose.Schema.Types.ObjectId, ref: 'Order'
    }],
    cart:{type: mongoose.Schema.Types.ObjectId, ref: 'Cart',required:true}
});

export const UserModel =mongoose.model<IUser>("User",userSchema);