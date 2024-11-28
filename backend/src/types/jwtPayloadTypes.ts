import { Schema } from "mongoose";

// JWT payload type
export interface IBaseJwtPayload{
  userId: Schema.Types.ObjectId;
  passwordChangedAt: string;
}
export interface IUserJwtPayload extends IBaseJwtPayload{
  cartId: Schema.Types.ObjectId;
}
export interface IAdminJwtPayload{
  role:string
}

export type IJwtPayload= IUserJwtPayload | IAdminJwtPayload 