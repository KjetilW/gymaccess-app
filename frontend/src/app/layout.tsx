import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';

// Fonts defined here so both locale and admin layouts can import them
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Root layout is a pass-through — html/body are rendered by [locale]/layout.tsx
// and admin/layout.tsx respectively so each can set the correct lang attribute.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as any;
}
