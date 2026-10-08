import { Html, Head, Main, NextScript } from 'next/document';

const THEME_SCRIPT =
  "try{var t=localStorage.getItem('hairflow_theme')||'light';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
