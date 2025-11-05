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
            console.error(error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "Sudeep"
}).addTo(map)

const markers = {};

socket.on("recieve-location", (data) => {
    const {
        id,
        latitude,
        longitude
    } = data;
    map.setView([latitude, longitude], 1);

    if (marker[id]) {
        marker[id].setLatLng([latitude, longitude])
    } else {
        marker[id] = L.markers([latitude, longitude]).addTo(map);
    }
});


socket.on("user-disconnected", (id) => {
    if (marker[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});