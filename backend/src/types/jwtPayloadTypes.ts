import { IObjectId } from "./modalTypes";


// JWT payload type
export interface IBaseJwtPayload{
  userId: IObjectId;
  passwordChangedAt: string;
}
export interface IUserJwtPayload extends IBaseJwtPayload{
  cartId: IObjectId;
}
export interface IAdminJwtPayload extends IBaseJwtPayload{
  role:string
}

export type IJwtPayload= IUserJwtPayload | IAdminJwtPayload 


export const isBasePayload = (payload: any): payload is IBaseJwtPayload => {
  return (
    payload &&
    "userId" in payload &&
    "passwordChangedAt" in payload
  );
};

export const isUserPayload = (payload: IBaseJwtPayload) => {
  return isBasePayload(payload) && "cartId" in payload;
};

export const isAdminPayload = (payload: IBaseJwtPayload) => {
  return isBasePayload(payload) && "role" in payload;
};