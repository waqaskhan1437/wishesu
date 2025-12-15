export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  TOKEN_SECRET: string; // set in Workers secrets
};

export function mustGetSecret(env: any, key: string): string {
  const v = env?.[key];
  if (!v || typeof v !== "string") throw new Error(`Missing secret: ${key}`);
  return v;
}
