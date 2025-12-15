export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: number;
};

export class AuthRepo {
  constructor(private db: D1Database) {}

  async countUsers(): Promise<number> {
    const r = await this.db.prepare("SELECT COUNT(1) as c FROM users").first<{ c: number }>();
    return r?.c ?? 0;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    return await this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<UserRow>();
  }

  async insert(user: UserRow) {
    await this.db
      .prepare("INSERT INTO users (id,email,password_hash,role,created_at) VALUES (?,?,?,?,?)")
      .bind(user.id, user.email, user.password_hash, user.role, user.created_at)
      .run();
    return user;
  }
}
