import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { startAtHome } from './startAtHome';
import './styles.css';

startAtHome();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
