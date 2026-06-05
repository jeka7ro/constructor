import React from 'react'
import ReactDOM from 'react-dom/client'
import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css";
import App from './App'
import './index.css'
import './i18n/index.js'

// Activeaza polyfill pentru Drag & Drop pe ecrane touch (ex: iPad)
polyfill({
    // holdToDrag: 300, // milisecunde pana incepe drag-ul pe touch (optional)
});

// Hack recomandat de mobile-drag-drop pt a preveni conflictul de scroll pe unele browsere vechi (iOS)
window.addEventListener('touchmove', function() {}, {passive: false});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
