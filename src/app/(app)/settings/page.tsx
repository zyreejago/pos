import type { Metadata } from 'next';
import { SettingsForm } from '@/components/settings/settings-form';

export const metadata: Metadata = {
  title: 'Settings - Toko App',
  description: 'Configure system settings for your Toko App.',
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">System Settings</h1>
      </div>
      <SettingsForm />
    </div>
  );
}
