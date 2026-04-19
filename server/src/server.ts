import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB, connectMockDB } from "./database";
import dns from "node:dns/promises";
import rateLimit from 'express-rate-limit';

dotenv.config();
const app = express();
dns.setServers(["1.1.1.1"]);
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(helmet());
const { ATLAS_URI } = process.env;
//live database
if (!ATLAS_URI) {
     console.error(
        "No .env has been defined in config.env"
    );
   process.exit(1);
}

import { userRouter } from "./routes/user.routes";
import { activityRouter } from "./routes/activity.routes";
import { registrationRouter } from "./routes/registration.routes";
import { ngoRouter } from "./routes/ngo.routes";
import { authRouter } from "./routes/auth.routes";
import { notificationRouter } from "./routes/notification.routes";
import { authMiddleware } from "./authMiddleware";
import { requireRole } from "./roleMiddleware";

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // max 100 requests per window
    message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 10,                    // max 10 login attempts
    message: { message: 'Too many login attempts, please try again later.' }
});

//public routes
app.use("/auth", authRouter);
//route middleware (NOT READY)
//app.use(authMiddleware);

//api limit
app.use(generalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

//api routes
app.use("/users", userRouter);
app.use("/activity", activityRouter);
app.use("/registration", registrationRouter);
app.use("/ngo", ngoRouter);
app.use("/notification", notificationRouter);

connectDB(ATLAS_URI).then(() => { 
    app.listen(3000, () => {
        console.log(`Server running at http://localhost:3000...`);
    });
}).catch((error) => console.error(error));

// hardcode database
// connectMockDB("Mock").then(() => { 
//     app.listen(3000, () => {
//         console.log(`Server running at http://localhost:3000...`);
//     });
// }).catch((error) => console.error(error));
