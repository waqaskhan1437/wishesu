export type ProductCreateIn = {
  title: string;
  slug: string;
  description?: string;
  price?: number;
  currency?: string;
};

export type ProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  created_by: string;
  created_at: number;
  updated_at: number;
};
