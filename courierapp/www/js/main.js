const map = L.map("map").setView([50.061, 19.938], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

async function loadRoute() {
  const url = "http://localhost:3000/stops";

  try {
    const data = await fetch(url).then((r) => r.json());
    renderStops(data);
  } catch (err) {
    console.error("Błąd pobierania trasy:", err);
    alert("Nie udało się pobrać trasy!");
  }
}

function renderStops(stops) {
  const coordinates = [];

  stops.forEach((p) => {
    coordinates.push([p.lat, p.lng]);

    let marker = L.marker([p.lat, p.lng]).addTo(map);
    marker.bindPopup(`<b>${p.name}</b><br>ETA: ${p.eta || "-"}<br>`);
  });

  map.fitBounds(coordinates);

  if (window.routingControl) {
    map.removeControl(window.routingControl);
  }

  window.routingControl = L.Routing.control({
    waypoints: coordinates.map(([lat, lng]) => L.latLng(lat, lng)),
    routeWhileDragging: false,
    show: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
  }).addTo(map);
}
