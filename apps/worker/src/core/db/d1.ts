import { HttpError } from "../errors";

export async function d1One<T>(stmt: D1PreparedStatement): Promise<T> {
  const r = await stmt.first<T>();
  if (!r) throw new HttpError(404, "NOT_FOUND");
  return r;
}

export async function d1All<T>(stmt: D1PreparedStatement): Promise<T[]> {
  const r = await stmt.all<T>();
  return r.results ?? [];
}
