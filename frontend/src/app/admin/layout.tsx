// Server component wrapper — forces dynamic rendering for all admin routes
// (admin pages use localStorage for auth tokens and can't be statically generated)
export const dynamic = 'force-dynamic';

import AdminLayoutClient from './AdminLayoutClient';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
