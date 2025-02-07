import jwt from "jsonwebtoken";

import { IJwtPayload } from "../types/jwtPayloadTypes";
import { IObjectId } from "../types/modalTypes";

// Generate JWT function
export const jwtGenerator = (
  userId: IObjectId,
  passwordChangedAt: string,
  cartId?: IObjectId,
  role: string = "user"
): string => {
  let payload: IJwtPayload;

  if (role === "user") {
    if (!cartId) {
      throw new Error("cartId is required for the user role");
    }
    payload = { userId, passwordChangedAt, cartId };
  } else {
    payload = { userId, passwordChangedAt, role };
  }
  const expiresIn = role === "admin" ? "1d" : "12h";
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });
};
