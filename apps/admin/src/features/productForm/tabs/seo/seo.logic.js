import { api } from "../../../../core/apiClient.js";

export async function getSeo(productId) {
  return await api.getSeo(productId);
}
export async function saveSeo(productId, input) {
  return await api.saveSeo(productId, input);
}
