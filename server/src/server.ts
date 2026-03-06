import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB, connectMockDB } from "./database";
import { userRouter } from "./user.routes";
import { activityRouter } from "./activity.routes";
import { registrationRouter } from "./registration.routes";
import { ngoRouter } from "./ngo.routes";

//dotenv.config();
//const { ATLAS_URI } = process.env;
const app = express();
app.use(cors());

//hardcode database
app.use(express.json());
app.use("/users", userRouter);
app.use("/activity", activityRouter);
app.use("/registration", registrationRouter);
app.use("/ngo", ngoRouter);
connectMockDB("Mock").then(() => { 
    app.listen(3000, () => {
        console.log(`Server running at http://localhost:3000...`);
    });
}).catch((error) => console.error(error));


//live database
// if (!ATLAS_URI) {
//     console.error(
//         "No .env has been defined in config.env"
//     );
//    process.exit(1);
// }

// connectDB(ATLAS_URI).then(() => { 
//     app.listen(3000, () => {
//         console.log(`Server running at http://localhost:3000...`);
//     });
// }).catch((error) => console.error(error));
