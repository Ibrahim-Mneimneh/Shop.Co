import mongoose,{Types,Schema} from "mongoose"

export type IObjectId=Types.ObjectId
export type IDecimal=Types.Decimal128
export type ClientSession=mongoose.ClientSession

export interface IOrderQuantity{
  size:string,
  quantity:number
}

export interface IProductRef{
    variant: Types.ObjectId,
    quantity: IOrderQuantity[],
    price?:Types.Decimal128
}
