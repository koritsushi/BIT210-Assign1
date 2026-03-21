import * as mongodb from "mongodb";

export class MockCollection<T> {
    private data: T[];

    constructor(data: T[]) {
        this.data = data;
    }

    find(_filter = {}) {
        return {
            toArray: async () => this.data
        };
    }

    async findOne(filter: any) {
        return this.data.find(item =>
        Object.entries(filter).every(([k, v]) => (item as any)[k]?.toString() === v?.toString())
        ) || null;
    }

    async insertOne(doc: T) {
       const newDoc = { 
            _id: new mongodb.ObjectId(), //auto generate _id
            ...(doc as any) 
        };
        this.data.push(newDoc as T);
        return { 
            acknowledged: true,          //route checks this
            insertedId: (newDoc as any)._id 
        };
    }

    async updateOne(filter: Partial<T>, update: { $set: Partial<T> }) {
        const index = this.data.findIndex(item =>
            Object.entries(filter).every(([k, v]) => (item as any)[k]?.toString() === v?.toString())
        );
        if (index !== -1) {
            this.data[index] = { ...this.data[index], ...update.$set };
        }
        return { 
            modifiedCount: index !== -1 ? 1 : 0,
            matchedCount: index !== -1 ? 1 : 0 
        };
    }

    async deleteOne(filter: Partial<T>) { 
        const index = this.data.findIndex(item =>
        Object.entries(filter).every(([k, v]) => (item as any)[k]?.toString() === v?.toString())
        );
        if (index !== -1) this.data.splice(index, 1);
        return { deletedCount: index !== -1 ? 1 : 0 };
    }
}