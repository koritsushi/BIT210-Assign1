import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";   // import your extended type

export const requireRole = (allowedRoles: ('Employee' | 'Admin')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Make sure user is authenticated first
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // 2. Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
            message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        });
    }

    next(); // user has the right role
  };
};