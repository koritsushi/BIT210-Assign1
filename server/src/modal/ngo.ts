import * as mongodb from "mongodb";

export interface Ngo {
    _id?: mongodb.ObjectId | number;
    name: string;
    description?: string;
    location: string;
    service_type: string;
    is_active: boolean;
}
