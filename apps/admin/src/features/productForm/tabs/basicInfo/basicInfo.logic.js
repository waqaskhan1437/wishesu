import { api } from "../../../../core/apiClient.js";

export async function createProduct(input) {
  return await api.createProduct(input);
}
