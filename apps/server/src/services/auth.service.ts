import argon2 from 'argon2';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

export class AuthService {
  async hasAdmin(): Promise<boolean> {
    const result = await db.select({ id: users.id }).from(users).limit(1);
    return result.length > 0;
  }

  async setup(username: string, password: string): Promise<void> {
    if (await this.hasAdmin()) throw new Error('Admin already exists');
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await db.insert(users).values({ username, password_hash: hash });
  }

  async verify(username: string, password: string): Promise<boolean> {
    const [user] = await db.select().from(users).limit(1);
    if (!user) return false;
    if (user.username !== username) return false;
    return argon2.verify(user.password_hash, password, { type: argon2.argon2id });
  }
}

export const authService = new AuthService();
