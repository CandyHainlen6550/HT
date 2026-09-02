import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { installIdsEntityRenderer } from './lib/idsEntityRender.js';
import './styles.css';
import './formation-fix.css';

const rootElement = document.getElementById('root');
installIdsEntityRenderer(rootElement);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
