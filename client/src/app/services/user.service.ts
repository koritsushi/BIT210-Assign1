import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly storageKey = 'bit210_users_v1';
  private memoryUsers: User[] = [];
  private readonly seedUsers: User[] = [
    { _id: 'U001', name: 'Alice Tan', email: 'alice.tan@help.org', department: 'IT', role: 'Employee' },
    { _id: 'U002', name: 'Raj Kumar', email: 'raj.kumar@help.org', department: 'Finance', role: 'Employee' },
    { _id: 'U003', name: 'Mei Ling', email: 'mei.ling@help.org', department: 'Marketing', role: 'Employee' },
    { _id: 'U004', name: 'Bob Lee', email: 'bob.lee@help.org', department: 'HR', role: 'Admin' },
    { _id: 'U005', name: 'John Lim', email: 'john.lim@help.org', department: 'Operations', role: 'Employee' },
    { _id: 'U006', name: 'Nur Aisyah', email: 'nur.aisyah@help.org', department: 'Community', role: 'Employee' },
    { _id: 'U007', name: 'Daniel Wong', email: 'daniel.wong@help.org', department: 'Logistics', role: 'Employee' },
    { _id: 'U008', name: 'Priya Nair', email: 'priya.nair@help.org', department: 'Events', role: 'Employee' },
    { _id: 'U009', name: 'Chen Wei', email: 'chen.wei@help.org', department: 'Support', role: 'Employee' },
    { _id: 'U010', name: 'Farah Aziz', email: 'farah.aziz@help.org', department: 'Admin', role: 'Employee' },
  ];

  constructor() {
    this.ensureSeedData();
  }

  getUsers(): Observable<User[]> {
    return of(this.readUsers());
  }

  getUser(id: string): Observable<User> {
    const user = this.readUsers().find((u) => String(u._id) === id);
    return of(user as User);
  }

  createUser(user: User): Observable<string> {
    const current = this.readUsers();
    const record: User = {
      ...user,
      _id: user._id ? String(user._id) : this.generateId(),
    };
    current.push(record);
    this.writeUsers(current);
    return of(`Created user: ${record._id}`);
  }

  updateUser(id: string, user: User): Observable<string> {
    const current = this.readUsers();
    const index = current.findIndex((u) => String(u._id) === id);
    if (index === -1) return of(`User not found: ${id}`);

    current[index] = {
      ...current[index],
      ...user,
      _id: id,
    };
    this.writeUsers(current);
    return of(`Updated user: ${id}`);
  }

  deleteUser(id: string): Observable<string> {
    const current = this.readUsers();
    const next = current.filter((u) => String(u._id) !== id);
    this.writeUsers(next);
    return of(`Deleted user: ${id}`);
  }

  private ensureSeedData(): void {
    const existing = this.readUsers();
    if (existing.length === 0) {
      this.writeUsers(this.seedUsers);
      return;
    }

    const byId = new Map(existing.map((u) => [String(u._id), u]));
    let changed = false;
    for (const seedUser of this.seedUsers) {
      const key = String(seedUser._id);
      if (!byId.has(key)) {
        byId.set(key, seedUser);
        changed = true;
      }
    }

    if (changed) {
      this.writeUsers(Array.from(byId.values()));
    }
  }

  private readUsers(): User[] {
    const storage = this.getStorage();
    if (!storage) return this.memoryUsers;

    const raw = storage.getItem(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as User[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeUsers(users: User[]): void {
    const storage = this.getStorage();
    if (!storage) {
      this.memoryUsers = [...users];
      return;
    }
    storage.setItem(this.storageKey, JSON.stringify(users));
  }

  private generateId(): string {
    return `U${Date.now().toString().slice(-6)}`;
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  }
}
