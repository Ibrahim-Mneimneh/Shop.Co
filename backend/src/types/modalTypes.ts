import mongoose, {Document, Schema} from "mongoose"

export interface IProductRef {
    productId: mongoose.Schema.Types.ObjectId;  
    quantity: number;
    price?:Schema.Types.Decimal128
    color:string,
    size:string
}