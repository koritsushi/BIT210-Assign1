import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";   // import your extended type

export function requireRole(...roles: Array<'Employee' | 'Admin'>) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Insufficient permissions' });
            return;
        }

        next();
    };
}