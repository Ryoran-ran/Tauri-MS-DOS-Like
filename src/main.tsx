import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';
import './styles/workspace.css';
import './styles/dos-theme.css';
import './styles/apps.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
