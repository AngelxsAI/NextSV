import { requirePageStaff as requireStaff } from '@/lib/page-auth';
import { settingsSchema } from '@/lib/schemas';
import { dbError } from '@/lib/http';
import { SettingsEditor } from '@/components/admin/settings-editor';
export default async function Settings() {
  const { client } = await requireStaff('settings.write');
  const { data, error } = await client
    .from('site_settings')
    .select('draft')
    .single();
  dbError(error);
  return <SettingsEditor initial={settingsSchema.parse(data?.draft)} />;
}
