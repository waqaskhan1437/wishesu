// 🔧 AUTH SERVICE - Max 150 lines
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
    
    if (!this.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }
    
    return {
      email: data.email,
      password_hash: await this.hashPassword(data.password),
      role: data.role || "user",
      created_at: Date.now()
    };
  }

  async register(email: string, password: string) {
    const exists = await this.repository.emailExists(email);
    if (exists) throw new Error("Email already exists");
    
    return await this.create({ email, password });
  }

  async login(email: string, password: string) {
    const user = await this.repository.findByEmail(email);
    if (!user) throw new Error("Invalid credentials");
    
    const valid = await this.verifyPassword(password, user.password_hash);
    if (!valid) throw new Error("Invalid credentials");
    
    return this.generateToken(user);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async hashPassword(password: string): Promise<string> {
    // Use crypto API
    return password; // Simplified
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return password === hash; // Simplified
  }

  private generateToken(user: User): string {
    return \`token-\${user.id}\`; // Simplified
  }
}
