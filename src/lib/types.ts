import type { ProductInput, FieldDefinition } from './schemas';
export type Product = ProductInput & {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  views: number;
  product_categories: { category_id: string }[];
  product_variants: ProductInput['variants'];
  product_field_values: ProductInput['field_values'];
  product_images: {
    id: string;
    alt: string;
    position: number;
    asset_id: string;
    url?: string;
    media_assets: { path: string } | null;
  }[];
};
export type Category = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  active: boolean;
  description: string;
  position: number;
};
export type { FieldDefinition };
