import db from '../db/init';
// import { User, CreateUser } from '../types/user';

// Let's rely on type inference or simple interfaces.
export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    created_at: string;
}

export const UserModel = {
    create: (user: Omit<User, 'id' | 'created_at'>): User => {
        const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        const info = stmt.run(user.name, user.email, user.password);
        return { id: Number(info.lastInsertRowid), ...user } as User;
    },

    findByEmail: (email: string): User | undefined => {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email) as User | undefined;
    },

    findById: (id: number): User | undefined => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id) as User | undefined;
    }
};
