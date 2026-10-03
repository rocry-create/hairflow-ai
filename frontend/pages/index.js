import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getUser } from '../lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    router.replace(user ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
