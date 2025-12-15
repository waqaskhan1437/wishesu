import { BaseRepository } from "../../core/base/repository";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: number;
}

export class AuthRepository extends BaseRepository<User> {
  tableName = "users";

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();
    return result || null;
  }
}
