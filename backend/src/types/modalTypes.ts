import mongoose,{Types,Schema} from "mongoose"

export type IObjectId=Types.ObjectId
export type IDecimal=Types.Decimal128


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
