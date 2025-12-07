let markers = [];
let currentMarker;
const btn = document.querySelector("button.btn");
const map = L.map("map").setView([50.061, 19.938], 13);

btn.addEventListener("click", loadRoute);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const courierIcon = L.icon({
        iconUrl: "./img/truck.svg",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -20],
      });

      if (!currentMarker) {
        // dodanie marker kuriera po raz pierwszy
        currentMarker = L.marker([lat, lng], {
          icon: courierIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup("Twoja lokalizacja")
          .openPopup();
      } else {
        // przesuwanie istniejącego markera
        currentMarker.setLatLng([lat, lng]);
      }

      // przesunięcie mapy na aktualną pozycję
      map.setView([lat, lng], 13);
    },
    (err) => console.warn("Błąd geolokalizacji:", err),
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
} else {
  console.warn("Geolokalizacja nie wspierana, używam domyślnej pozycji");
}

async function loadOrders() {
  const url = "http://localhost:3000/orders";
  const selectElement = document.getElementById("orderSelect");

  try {
    const response = await fetch(url);
    const data = await response.json();

    data.forEach((order) => {
      const option = document.createElement("option");
      option.value = order.id;
      option.textContent = order.name;
      selectElement.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
}

async function loadRoute() {
  const selectElement = document.getElementById("orderSelect");
  const orderId = selectElement.value;
  if (!orderId) return alert("Wybierz zlecenie!");

  const url = `http://localhost:3000/orders/${orderId}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    renderStops(data.stops);
  } catch (err) {
    console.error(err);
    alert("Nie udało się pobrać trasy!");
  }
}

function renderStops(stops) {
  const coordinates = [];

  // Usuwanie starych markerów
  markers.forEach((m) => map.removeLayer(m));
  markers = [];

  // Usuwanie starej trasy
  if (window.routingControl) {
    map.removeControl(window.routingControl);
  }

  if (currentMarker) {
    const pos = currentMarker.getLatLng();
    coordinates.push([pos.lat, pos.lng]);
  }

  //Dodanie nowych markerów
  stops.forEach((p) => {
    coordinates.push([p.lat, p.lng]);

    let marker = L.marker([p.lat, p.lng], { zIndexOffset: 1000 }).addTo(map);
    marker.bindPopup(`<b>${p.name}</b><br>ETA: ${p.eta || "-"}<br>`);
    markers.push(marker);
  });

  // Dopasowanie widoku mapy do wszystkich pinezek
  map.fitBounds(coordinates);

  // Dodanie trasy
  window.routingControl = L.Routing.control({
    waypoints: coordinates.map(([lat, lng]) => L.latLng(lat, lng)),
    routeWhileDragging: false,
    show: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
  }).addTo(map);

  // Wyświetlenie instrukcji dotarcia do celu/krok po kroku
  window.routingControl.on("routesfound", function (e) {
    const route = e.routes[0];
    const instructionsContainer = document.getElementById("directionsPanel");
    instructionsContainer.innerHTML = "";

    route.instructions.forEach((inst) => {
      const div = document.createElement("div");
      div.textContent = inst.text;
      instructionsContainer.appendChild(div);
    });
  });
}

document.addEventListener("DOMContentLoaded", loadOrders);
