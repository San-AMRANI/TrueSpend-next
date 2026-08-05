'use client';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  function logout() {
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <button className="btn btn-ghost btn-sm" style={{width: '100%'}} onClick={logout}>🚪 Logout</button>
  );
}
