import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const saved = window.localStorage.getItem('hairflow_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return <Component {...pageProps} />;
}
