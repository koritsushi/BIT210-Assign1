
export interface User {
    _id?: string;
    name: string;
    email: string;
    department: string;
    role: "Admin" | "Employee";
}