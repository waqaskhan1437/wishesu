// 🗄️ BASE REPOSITORY - Max 150 lines
// Generic database operations

import { IRepository } from "./interfaces";

export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(protected db: any) {}

  abstract tableName: string;

  async findById(id: string): Promise<T | null> {
    const result = await this.db
      .prepare(\`SELECT * FROM \${this.tableName} WHERE id = ?\`)
      .bind(id)
      .first();
    return result || null;
  }

  async findAll(filters?: any): Promise<T[]> {
    let query = \`SELECT * FROM \${this.tableName}\`;
    const params = [];
    
    if (filters) {
      const conditions = Object.keys(filters).map(key => \`\${key} = ?\`);
      query += \` WHERE \${conditions.join(" AND ")}\`;
      params.push(...Object.values(filters));
    }
    
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => "?").join(", ");
    const query = \`
      INSERT INTO \${this.tableName} (\${fields.join(", ")})
      VALUES (\${placeholders})
    \`;
    
    await this.db
      .prepare(query)
      .bind(...Object.values(data))
      .run();
    
    return data as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const setClause = fields.map(f => \`\${f} = ?\`).join(", ");
    const query = \`
      UPDATE \${this.tableName}
      SET \${setClause}
      WHERE id = ?
    \`;
    
    await this.db
      .prepare(query)
      .bind(...Object.values(data), id)
      .run();
    
    return { id, ...data } as T;
  }

  async delete(id: string): Promise<boolean> {
    await this.db
      .prepare(\`DELETE FROM \${this.tableName} WHERE id = ?\`)
      .bind(id)
      .run();
    return true;
  }

  // Pagination helper
  async paginate(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const query = \`
      SELECT * FROM \${this.tableName}
      LIMIT ? OFFSET ?
    \`;
    const result = await this.db.prepare(query).bind(limit, offset).all();
    return result.results || [];
  }
}
