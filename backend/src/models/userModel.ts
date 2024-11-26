import mongoose, {Document, Schema} from "mongoose"
import bcrypt from "bcryptjs"
export interface IUser extends Document {
    name: string,
    password: string,
    email: string,
    createdAt:Date,
    verificationTokenExpiresAt?:Date,
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
    passwordChangedAt:{type:Date}, // Update for later 
    isVerified:{type:Boolean,default:false},
    verificationTokenExpiresAt:{type:Date, validate: {
      validator: function (value: Date) {
        return !(this.isVerified && value);
      },
      message: 'verificationTokenExpiresAt should not be set, user already verified',
    },},
    address:{type:String,
    required:true},
    orders:[{
        type: mongoose.Schema.Types.ObjectId, ref: 'Order'
    }],
    cart:{type: mongoose.Schema.Types.ObjectId, ref: 'Cart'}
});

// Exclude password, passwordChagedAt, role, _id, cart, orders from responses
userSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.password
    delete ret.passwordChangedAt
    delete ret.role
    delete ret._id
    delete ret.cart
    delete ret.orders
    delete ret.verificationTokenExpiresAt
    delete ret.__v
    delete ret.isVerified
    return ret
}});

userSchema.methods.comparePasswords=async function(candidatePassword:string){
    return await bcrypt.compare(candidatePassword,this.password)
}


// findbyId

// findbyEmail

//delete cart if the user is deleted 



export const UserModel =mongoose.model<IUser>("User",userSchema);