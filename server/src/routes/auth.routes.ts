import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import speakeasy from "speakeasy";
import { collections } from "../database";

export const authRouter = express.Router();

const JWT_SECRET = process.env.JWT_SECRET ;
if (!JWT_SECRET) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in environment variables!');
}
const CLIENT_URL = process.env.CLIENT_URL;

// --- Email transporter ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- Helper: send email ---
async function sendEmail(to: string, subject: string, html: string) {
    await transporter.sendMail({
        from: `"Service Day Dashboard" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
}

// ─────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────
authRouter.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format." });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." });
        }

        // Check email not already taken
        const existing = await collections.users?.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: "Email is already registered." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate email verification token
        const verify_token = crypto.randomBytes(32).toString("hex");
        const verify_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save user
        const newUser = {
            name,
            email,
            password: hashedPassword,
            department: "",
            role: "Employee" as const,
            is_verified: false,
            verify_token,
            verify_expiry,
            twofa_enabled: false,
            twofa_secret: "",
        };

        await collections.users?.insertOne(newUser);

        // Send verification email
        const verifyUrl = `${CLIENT_URL}/verify-email?token=${verify_token}`;
        await sendEmail(
            email,
            "Verify your Service Day Dashboard account",
            `<p>Hi ${name},</p>
             <p>Click the link below to verify your email address:</p>
             <a href="${verifyUrl}">${verifyUrl}</a>
             <p>This link expires in 24 hours.</p>`
        );

        res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Registration failed." });
    }
});

// ─────────────────────────────────────────────
// GET /auth/verify-email?token=xxx
// ─────────────────────────────────────────────
authRouter.get("/verify-email", async (req, res) => {
    try {
        const { token } = req.query;
        //console.log("Token received:", token);
        if (!token) 
            return res.status(400).json({ message: "Token is required." });

        const user = await collections.users?.findOne({ verify_token: token });
        //console.log("user found:", user);
        if (!user) 
            return res.status(400).json({ message: "Invalid or expired token." });

        if (new Date() > new Date(user.verify_expiry)) {
            return res.status(400).json({ message: "Verification token has expired." });
        }

        await collections.users?.updateOne(
            { verify_token: token },
            { $set: { is_verified: true, verify_token: null, verify_expiry: null } }
        );

        res.status(200).json({ message: "Email verified successfully. You can now log in." });
    } catch (error) {
        res.status(500).json({ message: "Verification failed. error:" + error});
    }
});

// ─────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────
authRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // Find user by email
        const user = await collections.users?.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // Check email verified
        if (!user.is_verified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // If 2FA enabled — generate and send OTP, return tempToken
        if (user.twofa_enabled && user.twofa_secret) {
            const otp = speakeasy.totp({
                secret: user.twofa_secret,
                encoding: "base32",
            });

            // Send OTP via email
            await sendEmail(
                email,
                "Your Service Day Dashboard login code",
                `<p>Hi ${user.name},</p>
                 <p>Your verification code is: <strong>${otp}</strong></p>
                 <p>This code expires in 5 minutes.</p>`
            );

            // Sign a short-lived temp token for 2FA step
            const tempToken = jwt.sign(
                { _id: user._id, step: "2fa" },
                JWT_SECRET,
                { expiresIn: "5m" }
            );

            return res.status(200).json({ requires2FA: true, tempToken });
        }

        // No 2FA — return full JWT
            const token = jwt.sign(
            { _id: user._id.toString(), role: user.role },  // id not _id
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({ 
            token, 
            user: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
                }
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed. :" + error});
    }
});

// ─────────────────────────────────────────────
// POST /auth/verify-2fa
// ─────────────────────────────────────────────
authRouter.post("/verify-2fa", async (req, res) => {
    try {
        const { email, code, tempToken } = req.body;

        if (!email || !code || !tempToken) {
            return res.status(400).json({ message: "Email, code and token are required." });
        }

        // Verify temp token is valid and is a 2FA step token
        let decoded: any;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Session expired. Please log in again." });
        }

        if (decoded.step !== "2fa") {
            return res.status(401).json({ message: "Invalid token." });
        }

        // Find user
        const user = await collections.users?.findOne({ email });
        if (!user) return res.status(401).json({ message: "User not found." });

        // Verify OTP
        const isValid = speakeasy.totp.verify({
            secret: user.twofa_secret,
            encoding: "base32",
            token: code,
            window: 1, // allow 1 step tolerance (30s)
        });

        if (!isValid) {
            return res.status(401).json({ message: "Invalid or expired code." });
        }

        // Issue full JWT
        const token = jwt.sign(
            { _id: user._id.toString(), role: user.role },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({ token, user });
    } catch (error) {
        res.status(500).json({ message: "2FA verification failed." });
    }
});