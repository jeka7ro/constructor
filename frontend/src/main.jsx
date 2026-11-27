import React from 'react'
import ReactDOM from 'react-dom/client'

if (typeof window !== 'undefined') {
    window.React = React
    globalThis.React = React
}
import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css";
import App from './App'
import './index.css'
import './i18n/index.js'
import L from 'leaflet'

// Patch Leaflet bug #4643: prevent TypeError '_leaflet_pos' when unmounting during zoom/pan animations
if (typeof window !== 'undefined' && L && L.Map) {
    const origOnZoomTransitionEnd = L.Map.prototype._onZoomTransitionEnd;
    L.Map.prototype._onZoomTransitionEnd = function () {
        if (!this._panes || !this._panes.mapPane) return;
        return origOnZoomTransitionEnd?.apply(this, arguments);
    };
    const origGetMapPanePos = L.Map.prototype._getMapPanePos;
    L.Map.prototype._getMapPanePos = function () {
        if (!this._panes || !this._panes.mapPane) return new L.Point(0, 0);
        return origGetMapPanePos?.apply(this, arguments);
    };
    if (!L.Map.prototype.__safeInitPatched) {
        const origInitContainer = L.Map.prototype._initContainer;
        L.Map.prototype._initContainer = function (id) {
            const container = typeof id === 'string' ? document.getElementById(id) : id;
            if (container && container._leaflet_id) {
                container._leaflet_id = null;
                container.innerHTML = '';
            }
            return origInitContainer.call(this, id);
        };
        L.Map.prototype.__safeInitPatched = true;
    }
}

// Activeaza polyfill pentru Drag & Drop pe ecrane touch (ex: iPad)
polyfill({
    // holdToDrag: 300, // milisecunde pana incepe drag-ul pe touch (optional)
});

// Hack recomandat de mobile-drag-drop pt a preveni conflictul de scroll pe unele browsere vechi (iOS)
window.addEventListener('touchmove', function() {}, {passive: false});

// Brutal Fix pt Radix/Shadcn: Fortam deblocarea scroll-ului
setInterval(() => {
    const elements = [document.body, document.documentElement];
    elements.forEach(el => {
        if (el.hasAttribute('data-scroll-locked')) {
            el.removeAttribute('data-scroll-locked');
        }
        if (el.style.pointerEvents === 'none') {
            el.style.pointerEvents = '';
        }
        if (el.style.overflow === 'hidden' || el.style.overflowY === 'hidden') {
            el.style.overflow = '';
            el.style.overflowY = '';
        }
    });
}, 500);

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
