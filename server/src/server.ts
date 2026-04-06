import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB, connectMockDB } from "./database";
import dns from "node:dns/promises";

dotenv.config();
const app = express();
dns.setServers(["1.1.1.1"]);
app.use(cors());
app.use(express.json());
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

app.use("/auth", authRouter);
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
