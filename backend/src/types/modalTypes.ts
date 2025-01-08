import mongoose,{Types,Schema} from "mongoose"
import { IProductVariant } from "../models/product/productVariantModel"
import { IProduct } from "../models/product/productModel"

export type IObjectId=Types.ObjectId
export type IDecimal=Types.Decimal128
export type ClientSession=mongoose.ClientSession

export interface IOrderQuantity {
  size: string;
  quantity: number;
  success?: boolean;
  message?: string;
}

export interface IProductRef {
  variant: IObjectId;
  quantity: IOrderQuantity[];
  price?: number;

}
