import express from "express";
import jwt from "jsonwebtoken";
import { collections } from "../database";

export const authRouter = express.Router();

authRouter.post("/login", async (req, res) => {
    try {
        const { name } = req.body;

        const user = await collections.users?.findOne({ name });
        if (!user) {
            return res.status(401).json({ message: "Invalide Name" });
        }

        const token = jwt.sign(
            { _id: user._id, role: user.role},
            process.env.JWT_SECRET || "secret123",
            { expiresIn: "1d"}
        );

        res.status(200).json({token, user});
    } catch (error) {
        res.status(500).json({ message: "Login Failed!"});
    }
})