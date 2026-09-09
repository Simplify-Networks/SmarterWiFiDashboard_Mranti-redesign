// Entry for the static GitHub Pages build. The Cloudflare Worker build uses
// app/layout.tsx + app/page.tsx instead; both render the same <Home />.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import Home from '../app/page';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
