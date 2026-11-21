/**
 * solarTerminator.js — Pure NOAA / Meeus Astronomical Solar Terminator & Twilight GridLayer
 * Zero external API calls, zero emojis (100% pure vector SVG).
 * Calculates real-time subsolar point, solar altitude, day/night state,
 * progressive 5-band twilight canvas overlay, golden terminator curve, and vector sun zenith marker.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function normalizeLng(lng) {
    let x = ((lng + 180) % 360);
    if (x < 0) x += 360;
    return x - 180;
}

/**
 * Computes the subsolar point { lat, lng, declinationDeg, jd } for a given timestamp (ms)
 * using Jean Meeus / NOAA solar position equations.
 */
export function computeSubsolarPoint(timestampMs = Date.now()) {
    const jd = timestampMs / 86400000 + 2440587.5;
    const n = jd - 2451545.0; // days since J2000.0

    // Mean longitude & mean anomaly of the Sun (degrees)
    const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
    const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
    const gRad = g * DEG2RAD;

    // Ecliptic longitude (lambda) & obliquity of ecliptic (epsilon)
    const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
    const lambdaRad = lambda * DEG2RAD;
    const epsilon = (23.439 - 0.0000004 * n) * DEG2RAD;

    // Right ascension (alpha) & solar declination (delta)
    const sinLambda = Math.sin(lambdaRad);
    const cosLambda = Math.cos(lambdaRad);
    const alphaRad = Math.atan2(Math.cos(epsilon) * sinLambda, cosLambda);
    const alphaDeg = ((alphaRad * RAD2DEG) % 360 + 360) % 360;
    const deltaRad = Math.asin(Math.sin(epsilon) * sinLambda);
    const declinationDeg = deltaRad * RAD2DEG;

    // Greenwich Mean Sidereal Time (GMST) in degrees
    const gmstDeg = ((280.46061837 + 360.98564736629 * n) % 360 + 360) % 360;

    // Subsolar longitude = RA - GMST
    const subsolarLng = normalizeLng(alphaDeg - gmstDeg);

    return {
        lat: declinationDeg,
        lng: subsolarLng,
        declinationDeg,
        jd,
    };
}

/**
 * Computes solar elevation angle in degrees (-90..+90) at (lat, lng).
 */
export function getSolarAltitudeDeg(lat, lng, subsolar = computeSubsolarPoint()) {
    const phi = lat * DEG2RAD;
    const delta = subsolar.declinationDeg * DEG2RAD;
    const hourAngle = (lng - subsolar.lng) * DEG2RAD;

    const sinAlt =
        Math.sin(phi) * Math.sin(delta) +
        Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
    return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD2DEG;
}

/**
 * True if the sun is below the horizon (-0.833° including atmospheric refraction) at (lat, lng).
 */
export function isNightAtCoords(lat, lng, timestampMs = Date.now()) {
    const subsolar = computeSubsolarPoint(timestampMs);
    return getSolarAltitudeDeg(lat, lng, subsolar) < -0.833;
}

/**
 * Computes the terminator horizon curve (altitude = -0.833°) across [-360°, +360°] longitude.
 */
export function computeTerminatorCurveLatLngs(subsolar = computeSubsolarPoint(), stepDeg = 2) {
    const points = [];
    const delta = subsolar.declinationDeg * DEG2RAD;
    const tanDelta = Math.abs(Math.tan(delta)) < 1e-5 ? (delta >= 0 ? 1e-5 : -1e-5) : Math.tan(delta);

    for (let lng = -360; lng <= 360; lng += stepDeg) {
        const ha = (lng - subsolar.lng) * DEG2RAD;
        const latRad = Math.atan(-Math.cos(ha) / tanDelta);
        points.push([latRad * RAD2DEG, lng]);
    }
    return points;
}

/**
 * Maps solar altitude (degrees) to RGBA color for the 5 real twilight bands:
 * > +1.4°          : clear day (transparent)
 * +1.4° .. -0.833° : warm golden sunset/sunrise glow
 * -0.833° .. -6°   : civil twilight
 * -6° .. -12°      : nautical twilight
 * -12° .. -18°     : astronomical twilight
 * <= -18°          : deep indigo night
 */
function altitudeToTwilightRgba(altDeg) {
    if (altDeg >= 1.4) return [0, 0, 0, 0];
    if (altDeg >= -0.833) {
        const t = (1.4 - altDeg) / (1.4 - -0.833);
        return [245, 158, 11, Math.round(t * 48)];
    }
    if (altDeg >= -6) {
        const t = (-0.833 - altDeg) / 5.167;
        return [30, 41, 82, Math.round(48 + t * 56)];
    }
    if (altDeg >= -12) {
        const t = (-6 - altDeg) / 6;
        return [18, 27, 64, Math.round(104 + t * 44)];
    }
    if (altDeg >= -18) {
        const t = (-12 - altDeg) / 6;
        return [11, 18, 46, Math.round(148 + t * 32)];
    }
    return [8, 13, 36, 180];
}

const ZENITH_SUN_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5.5" fill="#FEF08A" stroke="#F59E0B" stroke-width="1.5"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="#FDE047" stroke-width="2" stroke-linecap="round"/></svg>`;

/**
 * Attaches the Solar Terminator GridLayer, golden horizon polyline, and Zenith Sun marker to a Leaflet map.
 * Returns { update(), remove() }.
 */
export function attachSolarTerminatorOverlay(map, L) {
    if (!map || !L) return { update: () => {}, remove: () => {} };

    let currentSubsolar = computeSubsolarPoint();

    const TwilightGridLayer = L.GridLayer.extend({
        createTile: function (coords) {
            const tile = document.createElement('canvas');
            const sampleSize = 64;
            tile.width = sampleSize;
            tile.height = sampleSize;
            tile.style.width = '256px';
            tile.style.height = '256px';
            tile.style.imageRendering = 'auto';

            const ctx = tile.getContext('2d');
            if (!ctx) return tile;

            const imgData = ctx.createImageData(sampleSize, sampleSize);
            const data = imgData.data;
            const z = coords.z;
            const n = Math.pow(2, z);

            for (let py = 0; py < sampleSize; py++) {
                const tileY = coords.y + (py + 0.5) / sampleSize;
                const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n)));
                const lat = latRad * RAD2DEG;

                for (let px = 0; px < sampleSize; px++) {
                    const tileX = coords.x + (px + 0.5) / sampleSize;
                    const lng = (tileX / n) * 360 - 180;
                    const alt = getSolarAltitudeDeg(lat, lng, currentSubsolar);
                    const [r, g, b, a] = altitudeToTwilightRgba(alt);
                    const idx = (py * sampleSize + px) * 4;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = a;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            return tile;
        },
    });

    const gridLayer = new TwilightGridLayer({
        tileSize: 256,
        opacity: 1,
        zIndex: 310,
        pane: 'overlayPane',
        noWrap: false,
    });

    const curvePoints = computeTerminatorCurveLatLngs(currentSubsolar);
    const haloLine = L.polyline(curvePoints, {
        color: '#f59e0b',
        weight: 6,
        opacity: 0.35,
        interactive: false,
    });
    const horizonLine = L.polyline(curvePoints, {
        color: '#fbbf24',
        weight: 2.2,
        opacity: 0.95,
        dashArray: '6, 5',
        interactive: false,
    });

    const sunIcon = L.divIcon({
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        html: `<div title="Zénith Solaire Live" style="width:32px;height:32px;border-radius:50%;background:radial-gradient(circle,rgba(254,240,138,0.95) 0%,rgba(245,158,11,0.85) 60%,rgba(245,158,11,0) 100%);box-shadow:0 0 22px 8px rgba(251,191,36,0.75);display:flex;align-items:center;justify-content:center;">${ZENITH_SUN_SVG}</div>`,
    });
    const sunMarker = L.marker([currentSubsolar.lat, currentSubsolar.lng], {
        icon: sunIcon,
        interactive: false,
    });

    gridLayer.addTo(map);
    haloLine.addTo(map);
    horizonLine.addTo(map);
    sunMarker.addTo(map);

    const update = () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        currentSubsolar = computeSubsolarPoint();
        const pts = computeTerminatorCurveLatLngs(currentSubsolar);
        haloLine.setLatLngs(pts);
        horizonLine.setLatLngs(pts);
        sunMarker.setLatLng([currentSubsolar.lat, currentSubsolar.lng]);
        gridLayer.redraw();
    };

    const timer = setInterval(update, 60000);

    const remove = () => {
        clearInterval(timer);
        try {
            map.removeLayer(gridLayer);
            map.removeLayer(haloLine);
            map.removeLayer(horizonLine);
            map.removeLayer(sunMarker);
        } catch (_) {}
    };

    return { update, remove };
}
