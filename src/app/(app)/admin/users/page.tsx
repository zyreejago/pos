import type { Metadata } from 'next';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'User Management - Toko App Superadmin',
  description: 'Manage all users, approve merchants, and oversee system access.',
};

export default function SuperAdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-foreground">User Management (Superadmin)</h1>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">All System Users</CardTitle>
          <CardDescription>
            View, manage, and approve all user accounts including merchants, admins, and kasirs.
            Use the actions to approve pending merchants, change passwords, or modify account status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable />
        </CardContent>
      </Card>
    </div>
  );
}
