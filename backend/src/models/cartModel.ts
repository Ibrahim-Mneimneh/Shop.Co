import mongoose, {Document,Types, Schema} from "mongoose"

import { IProductRef } from "../types/modalTypes";
import { numberToDecimal128,decimal128ToNumber} from "../types/modalTypes";


export interface ICart extends Document {
    user:Types.ObjectId,
    products:IProductRef[],
    totalPrice: Number
    updatePrice(): Promise<void>;
}


const cartSchema = new Schema<ICart>({
    user:{type: mongoose.Schema.Types.ObjectId, ref: 'User',required:true},
    products:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},color:{type:String,required:true},quantity:[{quantity:{type:Number,required:true,min:[1,"Quantity must be at least 1"]},size:{type: String, required: true, enum: ["XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size"]}}]
    }],
    totalPrice:{type:Schema.Types.Decimal128,default: 0.0,get:decimal128ToNumber, set: numberToDecimal128}
});


cartSchema.set("toJSON",{transform:(doc,ret)=>{
    delete ret.user
    return
}});

cartSchema.methods.updatePrice = async function (): Promise<void> {
    let total = 0;

    //Add a discount option for a special customer and Include a type for Product 
    

    for (let product of this.products) {
        const productData = await mongoose.model('Product').findById(product.productId);
        if (productData) {
            total += product.quantity * parseFloat(productData.price.toString());
        }
    }

    this.totalPrice = Types.Decimal128.fromString(total.toString());
};

cartSchema.pre("save",async function(next){
    try{
        await this.updatePrice()
        next()
    }
    catch(error:any){
        next(error)
    }
})


export const CartModel =mongoose.model<ICart>("Cart",cartSchema);