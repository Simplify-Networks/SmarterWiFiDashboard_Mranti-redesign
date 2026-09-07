import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'MRANTI | 5G Infrastructure Rollout',
  description:
    'Weekly commissioning and handover dashboard for MRANTI Park’s three-phase 5G router upgrade, delivered by Simplify.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
