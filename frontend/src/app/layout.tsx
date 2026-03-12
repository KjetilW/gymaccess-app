import './globals.css';

// Root layout is a pass-through — html/body are rendered by [locale]/layout.tsx
// and admin/layout.tsx respectively so each can set the correct lang attribute.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as any;
}
