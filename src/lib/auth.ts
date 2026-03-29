import * as jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  email: string;
}

export function verifyJwt(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }
   const decoded = jwt.verify(token,secret) as JwtPayload;
  
   return decoded ;
}
