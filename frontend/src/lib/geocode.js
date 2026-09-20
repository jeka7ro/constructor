const _frontendReverseGeoCache = new Map();
const _frontendGeoCache = new Map();

export const reverseGeocode = (latitude, longitude) => {
    const key = `${parseFloat(latitude).toFixed(4)},${parseFloat(longitude).toFixed(4)}`;
    if (_frontendReverseGeoCache.has(key)) {
        return Promise.resolve(_frontendReverseGeoCache.get(key));
    }
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            return reject(new Error("Google Maps nu este încărcat"));
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(latitude), lng: parseFloat(longitude) } }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const addr = results[0].formatted_address;
                _frontendReverseGeoCache.set(key, addr);
                resolve(addr);
            } else {
                reject(new Error("Geocodare eșuată"));
            }
        });
    });
};

export const geocodeAddress = (address) => {
    const key = (address || '').trim().toLowerCase();
    if (!key) {
        return Promise.reject(new Error("Adresă invalidă"));
    }
    if (_frontendGeoCache.has(key)) {
        return Promise.resolve(_frontendGeoCache.get(key));
    }
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            return reject(new Error("Google Maps nu este încărcat"));
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const res = {
                    lat: results[0].geometry.location.lat(),
                    lon: results[0].geometry.location.lng()
                };
                _frontendGeoCache.set(key, res);
                resolve(res);
            } else {
                reject(new Error("Geocodare eșuată"));
            }
        });
    });
};

