import { api } from "../../../../core/apiClient.js";

export async function listMedia(productId) {
  return await api.listMedia(productId);
}

export async function uploadMedia(productId, file, kind, alt) {
  return await api.uploadMedia(productId, file, kind, alt);
}
