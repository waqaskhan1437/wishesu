import { HttpError } from "../../core/errors";
import { hashPassword, verifyPassword } from "../../core/security/password";
import { signToken } from "../../core/security/tokens";
import type { AuthRepo } from "./repo";

export class AuthService {
  constructor(private repo: AuthRepo, private tokenSecret: string) {}

  async setupOwner(email: string, password: string) {
    const count = await this.repo.countUsers();
    if (count > 0) throw new HttpError(409, "SETUP_ALREADY_DONE");
    const existing = await this.repo.findByEmail(email);
    if (existing) throw new HttpError(409, "EMAIL_TAKEN");

    const user = {
      id: crypto.randomUUID(),
      email,
      password_hash: await hashPassword(password),
      role: "owner",
      created_at: Date.now(),
    };
    await this.repo.insert(user);
    return { id: user.id, email: user.email, role: user.role };
  }

  async login(email: string, password: string) {
    const u = await this.repo.findByEmail(email);
    if (!u) throw new HttpError(401, "INVALID_CREDENTIALS");
    const ok = await verifyPassword(password, u.password_hash);
    if (!ok) throw new HttpError(401, "INVALID_CREDENTIALS");

    const token = await signToken(this.tokenSecret, { id: u.id, role: u.role, email: u.email }, 60 * 60 * 8);
    return { token, user: { id: u.id, email: u.email, role: u.role } };
  }
}
