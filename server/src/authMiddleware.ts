import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables!');

interface JwtUser {
    _id: string;
    role: 'Employee' | 'Admin';
}

export interface AuthRequest extends Request {
  user?: JwtUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
      const header = req.headers['authorization'];

    // Return 401
    if (!header || !header.startsWith('Bearer ')) {
        console.log(header);
        res.status(401).json({ message: 'Authorization header missing or malformed' });
        return;
    }

    const token = header.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Token missing' });
        return;
    }

    jwt.verify(token, JWT_SECRET as string, (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err) {
            //Distinguish between expired and invalid tokens
            if (err.name === 'TokenExpiredError') {
                res.status(401).json({ message: 'Token has expired' });
                return;
            }
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        // Validate decoded payload has expected shape
        if (!decoded?._id || !decoded?.role) {
            res.status(401).json({ message: 'Token payload invalid' });
            return;
        }

        req.user = decoded as JwtUser;
        next();
    });
}