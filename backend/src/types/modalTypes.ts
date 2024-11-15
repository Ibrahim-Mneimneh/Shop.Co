import mongoose, {Document, Schema} from "mongoose"

export const decimal128ToNumber = (value: Schema.Types.Decimal128): number => parseFloat(value.toString());

export const numberToDecimal128 = (value: number): mongoose.Types.Decimal128 =>
  mongoose.Types.Decimal128.fromString(value.toFixed(2));

export interface IProductRef {
    productId: mongoose.Schema.Types.ObjectId;
    quantity: number;
    price?:Schema.Types.Decimal128
    color:string,
    size:string
}