'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <button className="btn btn-ghost btn-sm" style={{width: '100%'}} onClick={logout}>🚪 Logout</button>
  );
}
