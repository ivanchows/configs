function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

async function getServicesByZip(zip) {
  // Step 1: ZIP → lat/lon via Nominatim
  const geoUrl =
    'https://nominatim.openstreetmap.org/search?postalcode=' + zip +
    '&country=US&format=json&limit=1';

  const geoResponse = await fetch(geoUrl, {
    headers: { 'User-Agent': 'SentryNeighborhoodWatch/1.0 (cs546project)' }
  });
  if (!geoResponse.ok) throw 'Could not reach geocoding service. Please try again.';

  let geoData;
  try { geoData = JSON.parse(await geoResponse.text()); }
  catch (_) { throw 'Geocoding service returned an unexpected response.'; }

  if (!geoData || geoData.length === 0)
    throw 'ZIP code ' + zip + ' could not be found.';

  const centerLat = parseFloat(geoData[0].lat);
  const centerLon = parseFloat(geoData[0].lon);
  const radius = 10000; // 10 km

  // Step 2: Query Overpass via GET (avoids 406 that POST triggers on busy servers)
  const query =
    '[out:json][timeout:25];(' +
    'node["amenity"="police"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'way["amenity"="police"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'node["amenity"="fire_station"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'way["amenity"="fire_station"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'node["amenity"="hospital"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'way["amenity"="hospital"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'node["amenity"="urgent_care"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    'way["amenity"="urgent_care"](around:' + radius + ',' + centerLat + ',' + centerLon + ');' +
    ');out tags center;';

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  let overpassData = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint + '?data=' + encodeURIComponent(query), {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) continue;
      overpassData = JSON.parse(await res.text());
      break;
    } catch (_) {
      continue;
    }
  }

  if (!overpassData)
    throw 'Service data is temporarily unavailable. Please try again in a moment.';

  // Step 3: Sort into categories and compute distance
  const police = [], fire = [], hospital = [], urgentCare = [];

  for (const el of (overpassData.elements || [])) {
    const tags = el.tags || {};
    const name = tags.name || 'Unnamed';
    const phone = tags.phone || tags['contact:phone'] || null;

    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street'])      parts.push(tags['addr:street']);
    if (tags['addr:city'])        parts.push(tags['addr:city']);
    if (tags['addr:state'])       parts.push(tags['addr:state']);
    const address = parts.length ? parts.join(' ') : null;

    // lat/lon: nodes have it directly; ways use the center object
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    const distance = (elLat != null && elLon != null)
      ? haversine(centerLat, centerLon, elLat, elLon) + ' mi'
      : null;

    const entry = { name, phone, address, distance };

    if      (tags.amenity === 'police')      police.push(entry);
    else if (tags.amenity === 'fire_station') fire.push(entry);
    else if (tags.amenity === 'hospital')    hospital.push(entry);
    else if (tags.amenity === 'urgent_care') urgentCare.push(entry);
  }

  // Sort each category by distance ascending
  const byDist = (a, b) =>
    (parseFloat(a.distance) || 999) - (parseFloat(b.distance) || 999);
  police.sort(byDist);
  fire.sort(byDist);
  hospital.sort(byDist);
  urgentCare.sort(byDist);

  return { police, fire, hospital, urgentCare };
}

export { getServicesByZip };
