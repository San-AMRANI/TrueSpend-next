import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata = {
  title: 'TrueSpend - Personal Finance Dashboard',
  description: 'Track your spending, manage debts, and understand your true financial position.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
