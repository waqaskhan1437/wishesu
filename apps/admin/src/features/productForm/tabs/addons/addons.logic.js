import { api } from "../../../../core/apiClient.js";

export async function listAddons(productId) {
  return await api.listAddons(productId);
}

export async function addAddon(productId, input) {
  return await api.addAddon(productId, input);
}
