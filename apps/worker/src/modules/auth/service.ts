import { BaseService } from "../../core/base/service";
import { AuthRepository, User } from "./repository";

export class AuthService extends BaseService<User> {
  constructor(
    protected repository: AuthRepository,
    private secret: string
  ) {
    super(repository);
  }

  protected async validate(data: any): Promise<Partial<User>> {
    if (!data.email || !data.password) {
      throw new Error("Email and password required");
    }
    
    return {
      id: crypto.randomUUID(),
      email: data.email,
      password_hash: data.password,
      role: data.role || "user",
      created_at: Date.now()
    };
  }

  async register(email: string, password: string) {
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new Error("Email exists");
    
    return await this.create({ email, password });
  }

  async login(email: string, password: string) {
    const user = await this.repository.findByEmail(email);
    if (!user || user.password_hash !== password) {
      throw new Error("Invalid credentials");
    }
    
    return { token: `token-${user.id}`, user };
  }
}
