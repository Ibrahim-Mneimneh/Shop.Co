import mongoose, {Document, Schema} from "mongoose"

export interface ICart extends Document {
    user:mongoose.Schema.Types.ObjectId,
    products:IProductRef[],
    totalPrice: Schema.Types.Decimal128
    updatePrice(): Promise<void>;
}
export interface IProductRef {
    productId: mongoose.Schema.Types.ObjectId;  
    quantity: number;
    price:Schema.Types.Decimal128            
}

const cartSchema = new Schema<ICart>({
    
    user:{type: mongoose.Schema.Types.ObjectId, ref: 'User',required:true},
    products:[{productId:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},quantity:{type: Number, 
      required: true, 
      default: 0 },
    price:{ type: Schema.Types.Decimal128,  required: true }
    }],
    totalPrice:{type:Schema.Types.Decimal128,default: 0}
});


cartSchema.methods.updatePrice = async function (): Promise<void> {
    let total = 0;

    //Add a discount option for a special customer and Include a type for Product 
    

    for (let product of this.products) {
        const productData = await mongoose.model('Product').findById(product.productId);
        if (productData) {
            total += product.quantity * parseFloat(productData.price.toString());
        }
    }

    this.totalPrice = mongoose.Types.Decimal128.fromString(total.toString());
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