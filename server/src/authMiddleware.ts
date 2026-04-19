import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables!');

interface JwtUser {
    id: string;
    role: 'Employee' | 'Admin';
}

export interface AuthRequest extends Request {
  user?: JwtUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers['authorization'];

    if (!header)
        return res.redirect(`${process.env.CLIENT_URL}/login`);
        
    const token = header.split(' ')[1];
    if (!token)
        return res.redirect(`${process.env.CLIENT_URL}/login`);
    
    jwt.verify(
    token,
    process.env.JWT_SECRET as string, // Type assertion (assumes you have JWT_SECRET set)
    (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      // Attach the decoded payload to the request
      req.user = decoded as JwtUser;
      next();
    }
  );
}