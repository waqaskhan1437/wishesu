import { HttpError } from "../../core/errors";
import type { MediaRepo } from "./repo";

export class MediaService {
  constructor(private bucket: R2Bucket, private repo: MediaRepo) {}

  async upload(productId: string, file: File, kind: "image" | "video", alt?: string) {
    if (!productId) throw new HttpError(400, "INVALID_PRODUCT");
    if (!file) throw new HttpError(400, "FILE_REQUIRED");

    const id = crypto.randomUUID();
    const key = `products/${productId}/${id}`;

    const buf = await file.arrayBuffer();
    await this.bucket.put(key, buf, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const rec = await this.repo.insert({
      id,
      product_id: productId,
      r2_key: key,
      kind,
      alt: alt ?? null,
      sort_order: 0,
      created_at: Date.now(),
    });

    return { key, rec };
  }

  async list(productId: string) {
    return await this.repo.listByProduct(productId);
  }
}
