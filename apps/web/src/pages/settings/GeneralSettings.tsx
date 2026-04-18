import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateSettingsSchema, type UpdateSettingsInput } from '@flame-claude/shared';
import { useSettings, useUpdateSettings } from '../../api/hooks.js';
import { Input } from '../../components/ui/Form.js';
import { Toggle, Select } from '../../components/ui/Form.js';
import { Button } from '../../components/ui/Button.js';
import { ErrorMessage, Spinner } from '../../components/ui/Primitives.js';
import { useState } from 'react';

export default function GeneralSettings() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { isDirty, isSubmitting } } = useForm<UpdateSettingsInput>({
    resolver: zodResolver(UpdateSettingsSchema),
    values: settings,
  });

  if (isLoading) return <Spinner />;

  const onSubmit = async (data: UpdateSettingsInput) => {
    await update.mutateAsync(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">General</h2>
        <Input label="Site Title" {...register('site_title')} />
        <Select label="Default Sort Order" {...register('default_sort_order')}>
          <option value="custom">Custom (drag order)</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="created_asc">Oldest first</option>
          <option value="created_desc">Newest first</option>
        </Select>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Link Behavior</h2>
        <Toggle
          label="Open apps in new tab"
          checked={watch('apps_open_in_new_tab') ?? true}
          onChange={(v) => setValue('apps_open_in_new_tab', v, { shouldDirty: true })}
        />
        <Toggle
          label="Open bookmarks in new tab"
          checked={watch('bookmarks_open_in_new_tab') ?? true}
          onChange={(v) => setValue('bookmarks_open_in_new_tab', v, { shouldDirty: true })}
        />
      </section>

      {update.error && <ErrorMessage message={update.error.message} />}

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save Changes
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
      </div>
    </form>
  );
}
