import mongoose, {Document, Schema} from "mongoose"

export interface ICart extends Document {
    user:mongoose.Schema.Types.ObjectId,
    products:{
        productId:mongoose.Schema.Types.ObjectId,
        quantity:number
    }[],
    totalPrice: Schema.Types.Decimal128
}

const cartSchema = new Schema<ICart>({
    
    user:{type: mongoose.Schema.Types.ObjectId, ref: 'User',required:true},
    products:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},quantity:{type: Number, 
      required: true, 
      default: 0 }
    }],
    totalPrice:{type:Schema.Types.Decimal128,default: 0}
});

cartSchema.pre("save",async function(next){
    let total=0;
    for (let product of this.products){
        const productData= await mongoose //Continue it after writing the Product Model
        if(productData){
            total+=product.quantity*parseFloat(productData.price.toString()); // ProductModel ref
        }
    }
    this.totalPrice=mongoose.Types.Decimal128.fromString(total.toString())
})


export const CartModel =mongoose.model<ICart>("Cart",cartSchema);