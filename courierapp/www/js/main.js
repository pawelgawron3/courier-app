let nextInstructionIndex = 0;
let markers = [];
let currentMarker;
let travelPath = [];
let travelLine = null;
const btn = document.querySelector("button.btn");
const map = L.map("map").setView([50.061, 19.938], 13);

btn.addEventListener("click", loadRoute);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;

      travelPath.push([latitude, longitude]);

      // jeśli linia istnieje - aktualizacja, jeśli niee to ją tworzymy
      if (travelLine) {
        travelLine.setLatLngs(travelPath);
      } else {
        travelLine = L.polyline(travelPath, { color: "blue", weight: 4 }).addTo(
          map
        );
      }

      const courierIcon = L.icon({
        iconUrl: "./img/truck.svg",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -20],
      });

      if (!currentMarker) {
        // dodanie marker kuriera po raz pierwszy
        currentMarker = L.marker([latitude, longitude], {
          icon: courierIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup("Twoja lokalizacja")
          .openPopup();
      } else {
        // przesuwanie istniejącego markera
        currentMarker.setLatLng([latitude, longitude]);
      }

      // przesunięcie mapy na aktualną pozycję
      map.setView([latitude, longitude], 13);

      // aktualizacja dynamicznie trasy
      if (window.routingControl) {
        const currentWaypoints = window.routingControl.getWaypoints();
        // ustaw pierwszy waypoint na aktualną pozycję kuriera
        const newWaypoints = [
          L.latLng(latitude, longitude),
          ...currentWaypoints.slice(1),
        ];
        window.routingControl.setWaypoints(newWaypoints);
      }
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
    const summary = e.routes[0].summary;
    const instructionsContainer = document.getElementById("directionsPanel");
    const routeInfo = document.getElementById("routeInfo");

    instructionsContainer.innerHTML = "";
    routeInfo.innerHTML = `
  <span>Dystans: <strong>${(summary.totalDistance / 1000).toFixed(
    2
  )} km</strong></span>
  <span>Szacowany czas: <strong>${(summary.totalTime / 60).toFixed(
    1
  )} min</strong></span>
`;

    route.instructions.forEach((inst) => {
      const div = document.createElement("div");
      div.textContent = inst.text;
      instructionsContainer.appendChild(div);
    });

    nextInstructionIndex = 0;
  });
}

// funkcja sprawdzająca odległość do następnej instrukcji i odtwarzająca ja
function checkNextInstruction() {
  if (!window.routingControl || !currentMarker) return;

  const route = window.routingControl.getPlan().getWaypoints();
  if (!route || nextInstructionIndex >= route.length) return;

  const currentPos = currentMarker.getLatLng();
  const nextWaypoint = route[nextInstructionIndex].latLng;

  const distance = map.distance(currentPos, nextWaypoint); // w metrach

  if (distance < 100) {
    const instText =
      window.routingControl._routes[0].instructions[nextInstructionIndex].text;
    const speak = new SpeechSynthesisUtterance(instText);
    speak.lang = "pl-PL";
    speechSynthesis.speak(speak);

    nextInstructionIndex++;
  }
}

setInterval(checkNextInstruction, 2000);

document.addEventListener("DOMContentLoaded", loadOrders);
