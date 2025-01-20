import mongoose,{Types} from "mongoose"

export type IObjectId=Types.ObjectId
export type IDecimal=Types.Decimal128
export type ClientSession=mongoose.ClientSession

export interface IToJSONOptions extends mongoose.ToObjectOptions {
  role?: "admin" | "user"
}

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
  cost?: number;
  units?: number;
  name?: string;
  category?: "Men" | "Women" | "Kids";
  image?:IObjectId
}
