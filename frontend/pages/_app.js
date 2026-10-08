import '../styles/globals.css';
import Head from 'next/head';
import { useEffect } from 'react';

function applyTheme() {
  const saved = window.localStorage.getItem('hairflow_theme') || 'light';
  const dark =
    saved === 'dark' || (saved === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    try {
      applyTheme();
    } catch (e) {
      // sem tema salvo
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      try {
        applyTheme();
      } catch (e) {
        // ignora
      }
    };
    if (media.addEventListener) media.addEventListener('change', onChange);

    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      if (media.removeEventListener) media.removeEventListener('change', onChange);
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#127d4b" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="HairFlow" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
