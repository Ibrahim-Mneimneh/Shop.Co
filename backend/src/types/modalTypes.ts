import mongoose,{Types,Schema} from "mongoose"
import { IProductVariant } from "../models/product/productVariantModel"

export type IObjectId=Types.ObjectId
export type IDecimal=Types.Decimal128
export type ClientSession=mongoose.ClientSession

export interface IOrderQuantity{
  size:string,
  quantity:number
}

export interface IProductRef{
    variant: IProductVariant | IObjectId,
    quantity: IOrderQuantity[],
    price?:number
}
