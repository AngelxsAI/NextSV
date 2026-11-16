import { requirePageStaff as requireStaff } from '@/lib/page-auth';
import { productSelect } from '@/lib/catalog';
import { dbError } from '@/lib/http';
import type { Product } from '@/lib/types';
import { ProductList } from '@/components/admin/product-list';
export default async function Products() {
  const { client } = await requireStaff();
  const { data, error } = await client
    .from('products')
    .select(productSelect)
    .order('updated_at', { ascending: false })
    .limit(1000);
  dbError(error);
  return <ProductList initial={(data || []) as Product[]} />;
}
