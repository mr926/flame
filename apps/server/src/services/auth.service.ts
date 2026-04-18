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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await (argon2 as any).hash(password, { type: 2 }); // 2 = argon2id
    await db.insert(users).values({ username, password_hash: hash });
  }

  async verify(username: string, password: string): Promise<boolean> {
    const [user] = await db.select().from(users).limit(1);
    if (!user) return false;
    if (user.username !== username) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (argon2 as any).verify(user.password_hash, password, { type: 2 });
  }
}

export const authService = new AuthService();
