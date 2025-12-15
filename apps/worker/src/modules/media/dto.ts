export type MediaRow = {
  id: string;
  product_id: string;
  r2_key: string;
  kind: "image" | "video";
  alt: string | null;
  sort_order: number;
  created_at: number;
};
