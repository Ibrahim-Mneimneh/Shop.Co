import mongoose,{Types,Schema} from "mongoose"

export type IObjectId=Types.ObjectId
export type IDecimal=Types.Decimal128

export const decimal128ToNumber = (value: Schema.Types.Decimal128): number => parseFloat(value.toString());


export const numberToDecimal128 = (value: number): Types.Decimal128 =>
  Types.Decimal128.fromString(value.toFixed(2));



export interface IOrderQuantity{
  size:string,
  quantity:number
}

export interface IProductRef {
    productId: Types.ObjectId;
    quantity: IOrderQuantity[];
    price?:Types.Decimal128
    color:string,
}
