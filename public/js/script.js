const socket = io();

console.log("hey");

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const {
                latitude,
                longitude
            } = position.coords;
            socket.emit("send-location", {
                latitude,
                longitude
            });
        },
        (error) => {
            console.error("Geolocation error:", error.message);
            alert("Unable to retrieve your location. Please enable location services and refresh the page.");
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
} else {
    console.error("Geolocation is not supported by this browser.");
    alert("Geolocation is not supported by your browser.");
}

const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

const markers = {};

// Store current user's socket ID
let currentUserId = null;

// Function to create a custom colored marker
function createColoredMarker(color, isCurrentUser = false) {
    const markerHtmlStyles = `
        background-color: ${color};
        width: 2rem;
        height: 2rem;
        display: block;
        left: -1rem;
        top: -1rem;
        position: relative;
        border-radius: 2rem 2rem 0;
        transform: rotate(45deg);
        border: 3px solid #FFFFFF;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    `;

    return L.divIcon({
        className: isCurrentUser ? "current-user-marker" : "other-user-marker",
        html: `<span style="${markerHtmlStyles}" />`,
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });
}

// Function to fit map bounds to show all markers
function fitMapBounds() {
    const markerBounds = [];
    for (const id in markers) {
        const marker = markers[id];
        markerBounds.push(marker.getLatLng());
    }

    if (markerBounds.length > 0) {
        if (markerBounds.length === 1) {
            // If only one marker, center on it with zoom level 16
            map.setView(markerBounds[0], 16);
        } else {
            // If multiple markers, fit bounds to show all
            const bounds = L.latLngBounds(markerBounds);
            map.fitBounds(bounds, {
                padding: [50, 50]
            });
        }
    }
}

socket.on("connect", () => {
    currentUserId = socket.id;
    console.log("Connected with ID:", currentUserId);
});

// Handle existing users when connecting
socket.on("existing-users", (users) => {
    console.log("Receiving existing users:", users);
    users.forEach((user, index) => {
        if (user.id !== currentUserId) {
            // Create marker for existing user with different color (blue)
            const existingMarker = L.marker([user.latitude, user.longitude], {
                icon: createColoredMarker('#3388ff', false)
            }).addTo(map);
            existingMarker.bindPopup(`User ${index + 1}: ${user.id.substring(0, 8)}`);
            markers[user.id] = existingMarker;
        }
    });
    fitMapBounds();
});

socket.on("receive-location", (data) => {
    const {
        id,
        latitude,
        longitude
    } = data;

    if (markers[id]) {
        // Update existing marker position
        markers[id].setLatLng([latitude, longitude]);
    } else {
        // Create new marker
        if (id === currentUserId) {
            // Current user's marker (red/green default)
            markers[id] = L.marker([latitude, longitude]).addTo(map);
            markers[id].bindPopup("You are here");
        } else {
            // Other users' markers (blue)
            markers[id] = L.marker([latitude, longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
            markers[id].bindPopup(`User: ${id.substring(0, 8)}`);
        }
    }

    // Fit bounds to show all markers, but only adjust view for current user's location
    if (id === currentUserId && Object.keys(markers).length === 1) {
        // If only current user, center on their location
        map.setView([latitude, longitude], 16);
    } else {
        // If multiple users, fit bounds to show all
        fitMapBounds();
    }
});

socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
        // Adjust map view after removing marker
        fitMapBounds();
    }
});
