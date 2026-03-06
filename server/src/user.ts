import * as mongodb from "mongodb";

export interface User {
    _id?: mongodb.ObjectId | number;
    name: string;
    email: string;
    department: string;
    role: "Admin" | "Employee";
}