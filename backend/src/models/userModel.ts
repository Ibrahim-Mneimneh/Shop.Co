import mongoose, {Document, Schema} from "mongoose"
import bcrypt from "bcryptjs"
export interface IUser extends Document {
    name: string,
    password: string,
    email: string,
    createdAt:Date,
    passwordChangedAt:Date,
    address:string,
    isVerified:boolean
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
    passwordChangedAt:{type:Date, required:true},
    isVerified:{type:Boolean,default:false},
    address:{type:String,
    required:true},
    orders:[{
        type: mongoose.Schema.Types.ObjectId, ref: 'Order'
    }],
    cart:{type: mongoose.Schema.Types.ObjectId, ref: 'Cart',required:true}
});

// Exclude password from responses
userSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.password
    return ret
}});

userSchema.methods.comparePasswords=async function(candidatePassword:string){
    return await bcrypt.compare(candidatePassword,this.password)
}


// findbyId

// findbyEmail


export const UserModel =mongoose.model<IUser>("User",userSchema);