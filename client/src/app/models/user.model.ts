
export interface User {
    _id?: string;
    name: string;
    email: string;
    department: string;
    role: "Admin" | "Employee";
    password?: string;          // bcrypt hashed
    is_verified?: boolean;      // email verified flag
    verify_token?: string;      // email verification token
    verify_expiry?: Date;       // token expiry
    twofa_secret?: string;      // 2FA TOTP secret
    twofa_enabled?: boolean;    // 2FA enabled flag
}