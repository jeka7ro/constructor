export const reverseGeocode = (latitude, longitude) => {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            return reject(new Error("Google Maps nu este încărcat"));
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: parseFloat(latitude), lng: parseFloat(longitude) } }, (results, status) => {
            if (status === 'OK' && results[0]) {
                resolve(results[0].formatted_address);
            } else {
                reject(new Error("Geocodare eșuată"));
            }
        });
    });
};

export const geocodeAddress = (address) => {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            return reject(new Error("Google Maps nu este încărcat"));
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                resolve({
                    lat: results[0].geometry.location.lat(),
                    lon: results[0].geometry.location.lng()
                });
            } else {
                reject(new Error("Geocodare eșuată"));
            }
        });
    });
};
