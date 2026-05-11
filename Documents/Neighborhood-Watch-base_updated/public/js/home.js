const serverIncidents = Array.isArray(window.__mapIncidents) ? window.__mapIncidents : [];

const staticCoords = {
  'Suspicious vehicle parked overnight': { lat: 40.7459, lng: -74.0285 },
  'Loose dog reported near Pier A': { lat: 40.7365, lng: -74.0276 },
  'Power outage on block': { lat: 40.7409, lng: -74.0298 },
  'Minor traffic incident, fender bender': { lat: 40.7374, lng: -74.0418 },
  'Package theft - suspect identified': { lat: 40.7479, lng: -74.0328 },
  'Package theft — suspect identified': { lat: 40.7479, lng: -74.0328 }
};

const staticFeed = [
  { status: 'active', statusClass: 'badge-active', title: 'Suspicious vehicle parked overnight', loc: 'Washington St & 7th St, Hoboken' },
  { status: 'authorities notified', statusClass: 'badge-notified', title: 'Loose dog reported near Pier A', loc: 'Pier A Park, NW corner, Hoboken' },
  { status: 'active', statusClass: 'badge-active', title: 'Power outage on block', loc: 'Hudson St between 4th and 5th, Hoboken' },
  { status: 'resolved', statusClass: 'badge-resolved', title: 'Minor traffic incident, fender bender', loc: 'Observer Hwy & Newark St, Hoboken' },
  { status: 'resolved', statusClass: 'badge-resolved', title: 'Package theft — suspect identified', loc: 'Garden St residential block, Hoboken' }
];

function normalizeIncident(incident) {
  const title = incident.title || incident.Title || 'Untitled incident';
  const loc = incident.loc || incident.location || 'Location unavailable';
  const fallbackCoords = staticCoords[title] || {};
  const lat = Number(incident.lat ?? incident.latitude ?? fallbackCoords.lat);
  const lng = Number(incident.lng ?? incident.longitude ?? fallbackCoords.lng);

  return {
    ...incident,
    title,
    loc,
    status: incident.status || 'active',
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  };
}

function markerColor(status) {
  const normalizedStatus = (status || '').toLowerCase();
  if (normalizedStatus === 'resolved') return '#22c55e';
  if (normalizedStatus === 'authorities notified') return '#f4a847';
  return '#4169e1';
}

function buildPopupContent(incident, link) {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-popup';
  wrapper.style.minWidth = '190px';
  wrapper.style.fontFamily = 'sans-serif';

  const title = document.createElement('div');
  title.style.fontSize = '13px';
  title.style.fontWeight = '600';
  title.style.marginBottom = '4px';
  title.textContent = incident.title;

  const location = document.createElement('div');
  location.style.fontSize = '11px';
  location.style.color = '#888';
  location.style.marginBottom = '10px';
  location.textContent = incident.loc;

  const anchor = document.createElement('a');
  anchor.href = link;
  anchor.style.fontSize = '12px';
  anchor.style.color = '#4169e1';
  anchor.style.fontWeight = '600';
  anchor.style.textDecoration = 'none';
  anchor.textContent = 'View more ->';

  wrapper.append(title, location, anchor);
  return wrapper;
}

const feedList = document.querySelector('.feed-list');
let feedLinks = Array.from(document.querySelectorAll('.feed-link'));

if (feedLinks.length === 0 && feedList) {
  feedList.innerHTML = '';
  staticFeed.forEach((incident) => {
    const link = document.createElement('a');
    link.href = '/incidents';
    link.className = 'feed-link';

    const item = document.createElement('div');
    item.className = 'feed-item';

    const meta = document.createElement('div');
    meta.className = 'feed-meta';

    const badge = document.createElement('span');
    badge.className = 'badge ' + incident.statusClass;
    badge.textContent = incident.status;

    const title = document.createElement('div');
    title.className = 'feed-title';
    title.textContent = incident.title;

    const location = document.createElement('div');
    location.className = 'feed-loc';
    location.textContent = incident.loc;

    meta.appendChild(badge);
    item.append(meta, title, location);
    link.appendChild(item);
    feedList.appendChild(link);
  });

  const countEl = document.querySelector('.panel.feed .panel-header span:last-child');
  if (countEl) countEl.textContent = staticFeed.length + ' reports';
  feedLinks = Array.from(document.querySelectorAll('.feed-link'));
}

const mapEl = document.getElementById('incidentMap');

if (mapEl && typeof L !== 'undefined') {
  const map = L.map(mapEl, { scrollWheelZoom: false }).setView([40.7433, -74.0324], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);

  const normalizedServerIncidents = serverIncidents.map(normalizeIncident);
  const serverIncidentsWithCoords = normalizedServerIncidents.filter((incident) => incident.lat !== null && incident.lng !== null);
  const mapData = serverIncidentsWithCoords.length > 0
    ? serverIncidentsWithCoords
    : staticFeed.map((incident) => normalizeIncident(incident));

  const markers = mapData.map((incident) => {
    const link = incident._id ? '/incident_card/' + incident._id : '/incidents';
    const marker = L.circleMarker([incident.lat, incident.lng], {
      radius: 9,
      fillColor: markerColor(incident.status),
      color: '#0d1117',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(map);

    marker.bindPopup(buildPopupContent(incident, link), { maxWidth: 240 });
    return marker;
  });

  if (markers.length > 0) {
    const bounds = L.latLngBounds(mapData.map((incident) => [incident.lat, incident.lng]));
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
  }

  feedLinks.forEach((link, index) => {
    if (markers[index]) {
      link.addEventListener('mouseenter', () => markers[index].openPopup());
    }
  });
}
