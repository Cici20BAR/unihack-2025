// ------------------------------------------------------------
// bus_map.js – GTFS + Geoapify + DistanceMatrix → MINUTES (ceil)
// ------------------------------------------------------------

// -------------------- Config / Global vars --------------------
const minLon = 21.1350;
const minLat = 45.7100;
const maxLon = 21.3200;
const maxLat = 45.8050;

const agencyId = 8;
const updateIntervalMs = 5000; // 5 sec live updates
const MATRIX_URL = "https://api.distancematrix.ai/maps/api/distancematrix/json";

const urlRoutes    = "https://api.tranzy.ai/v1/opendata/routes";
const urlTrips     = "https://api.tranzy.ai/v1/opendata/trips";
const urlStopTimes = "https://api.tranzy.ai/v1/opendata/stop_times";
const urlStops     = "https://api.tranzy.ai/v1/opendata/stops";
const urlShapes    = "https://api.tranzy.ai/v1/opendata/shapes";

let geoapifyApiKey = '';
let tranzyApiKey   = '';
let matrixApiKey   = '';
let map            = null;

// -------------------- Load API keys --------------------
async function pullAPiKey() {
    const r = await fetch('/static/js/package.json');
    if (!r.ok) throw new Error('package.json missing');
    const d = await r.json();
    geoapifyApiKey = d.geoapifyApiKey;
    tranzyApiKey   = d.tranzyApiKey;
    matrixApiKey   = d.matrixApiKey;
    if (!geoapifyApiKey || !tranzyApiKey || !matrixApiKey) throw new Error('API keys missing');
}

// -------------------- Fetch Tranzy endpoint --------------------
async function getBusEndpoint(url) {
    const r = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-API-KEY': tranzyApiKey,
            'X-Agency-Id': agencyId
        }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

// -------------------- Route + Trip --------------------
async function getRouteWithShape(shortName) {
    const routes = await getBusEndpoint(urlRoutes);
    const route  = routes.find(r => r.route_short_name === shortName);
    if (!route) throw new Error(`Route ${shortName} not found`);

    const trips = await getBusEndpoint(urlTrips);
    const trip  = trips.find(t => t.route_id === route.route_id);
    if (!trip) throw new Error('Trip not found');

    return { route, trip };
}

// -------------------- Stops --------------------
async function getStopsForTrip(tripId) {
    const stopTimes = await getBusEndpoint(urlStopTimes);
    const ordered = stopTimes.filter(st => st.trip_id === tripId).sort((a,b)=>a.stop_sequence-b.stop_sequence);
    const stops = await getBusEndpoint(urlStops);
    const stopList = [];
    for (const st of ordered) {
        const s = stops.find(x => x.stop_id === st.stop_id);
        if (s) stopList.push({ lon:+s.stop_lon, lat:+s.stop_lat, name:s.stop_name });
    }
    return stopList;
}

// -------------------- GTFS shape --------------------
async function getShapeGeometry(shapeId) {
    if (!shapeId) return null;
    const shapes = await getBusEndpoint(urlShapes);
    const shapePoints = shapes.filter(s => s.shape_id === shapeId).sort((a,b)=>a.shape_pt_sequence-b.shape_pt_sequence);
    if (!shapePoints.length) return null;
    const coords = shapePoints.map(p => [p.shape_pt_lon, p.shape_pt_lat]);
    return { type:"Feature", geometry:{type:"LineString", coordinates:coords}, properties:{name:"Route", source:"GTFS shapes.txt"} };
}

// -------------------- Fallback route (Geoapify/straight) --------------------
async function buildFallbackRoute(stops) {
    if (stops.length <= 2) {
        const coords = stops.map(p => [p.lon, p.lat]);
        return { type:"Feature", geometry:{type:"LineString", coordinates:coords}, properties:{name:"Route", source:"fallback straight"} };
    }
    const MAX_WAYPOINTS = 100;
    const chunks = [];
    for (let i=0;i<stops.length;i+=MAX_WAYPOINTS) chunks.push(stops.slice(i,i+MAX_WAYPOINTS));
    const segments = [];
    for (const chunk of chunks) {
        const coordsStr = chunk.map(p=>`${p.lon},${p.lat}`).join(';');
        const url = `https://api.geoapify.com/v1/map-matching?coordinates=${coordsStr}&mode=drive&apiKey=${geoapifyApiKey}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) continue;
            const data = await resp.json();
            const geom = data?.features?.[0]?.geometry;
            if (geom?.coordinates) segments.push(geom.coordinates);
        } catch {}
    }
    if (!segments.length) {
        const coords = stops.map(p=>[p.lon,p.lat]);
        return { type:"Feature", geometry:{type:"LineString", coordinates:coords}, properties:{name:"Route", source:"fallback straight"} };
    }
    const merged = segments[0].slice();
    for (let i=1;i<segments.length;i++) merged.push(...segments[i].slice(1));
    return { type:"Feature", geometry:{type:"LineString", coordinates:merged}, properties:{name:"Route", source:"Geoapify map-matching"} };
}

// -------------------- Distance Matrix → travel times in minutes (ceil) --------------------
async function calculateStopTimesMatrix(stops) {
    const tasks = [];
    for (let i=0;i<stops.length-1;i++) {
        const a = stops[i];
        const b = stops[i+1];
        const origin = `${a.lat},${a.lon}`;
        const dest   = `${b.lat},${b.lon}`;
        const url = `${MATRIX_URL}?origins=${origin}&destinations=${dest}&mode=driving&departure_time=now&key=${matrixApiKey}`;
        tasks.push(fetch(url).then(r=>r.json()).then(data=>{
            if(data.status!=='OK') throw new Error(JSON.stringify(data));
            const secs = data.rows[0].elements[0].duration.value;
            return Math.ceil(secs/60);
        }).catch(_=>null));
    }

    const durations = await Promise.all(tasks);
    const results = [];
    let cumulative = 0;
    for (let i=0;i<durations.length;i++) {
        const mins = durations[i] || 0;
        cumulative += mins;
        results.push({ from:stops[i].name, to:stops[i+1].name, minutes:mins, cumulative });
    }
    return results;
}

// -------------------- Next tram arrival --------------------
function getNextTramArrival(currentDate = new Date(), firstHour = 4, intervalMins = 15) {
    const now = currentDate;
    const firstTram = new Date(now);
    firstTram.setHours(firstHour, 0, 0, 0);

    if (now < firstTram) {
        return Math.ceil((firstTram - now) / 60000); // minutes until first tram
    }

    const minutesSinceFirst = Math.floor((now - firstTram) / 60000);
    const intervalsPassed = Math.floor(minutesSinceFirst / intervalMins);
    const nextTram = new Date(firstTram.getTime() + (intervalsPassed + 1) * intervalMins * 60000);

    return Math.ceil((nextTram - now) / 60000);
}

// -------------------- Render stops --------------------
function renderStopsMatrix(stops, stopTimes) {
    const stopsList    = document.getElementById('stops-list');
    const locationList = document.getElementById('location-list');
    const timeList     = document.getElementById('time-list');
    if (!stopsList || !locationList || !timeList) return;

    stopsList.innerHTML = '';
    locationList.innerHTML = '';
    timeList.innerHTML = '';

    const nextTramMins = getNextTramArrival();

    stops.forEach((stop, idx) => {
        const liStop = document.createElement('li');
        liStop.textContent = idx+1;
        stopsList.appendChild(liStop);

        const liName = document.createElement('li');
        liName.textContent = stop.name;
        locationList.appendChild(liName);

        const liTime = document.createElement('li');
        liTime.textContent = idx===0
            ? `0 min (Next tram in ${nextTramMins} min)`
            : stopTimes[idx-1]?.cumulative+' min';
        timeList.appendChild(liTime);
    });
}

// -------------------- Map functions --------------------
function createMap() {
    map = new maplibregl.Map({
        container:'myMap',
        style:`https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${geoapifyApiKey}`,
        center:[(minLon+maxLon)/2,(minLat+maxLat)/2],
        zoom:13,
        maxBounds:[[minLon,minLat],[maxLon,maxLat]],
        maxZoom:32,
        minZoom:12,
        attributionControl:false
    });
}

function drawRouteOnly(geoJson) {
    if (!map?.isStyleLoaded()) { map.once('styledata',()=>drawRouteOnly(geoJson)); return; }
    if (map.getSource('route')) map.getSource('route').setData(geoJson);
    else { map.addSource('route',{type:'geojson',data:geoJson});
        map.addLayer({id:'route-line', type:'line', source:'route', paint:{'line-color':'#d00','line-width':5,'line-opacity':0.9}});}
    const bounds = new maplibregl.LngLatBounds();
    geoJson.geometry.coordinates.forEach(c=>bounds.extend(c));
    map.fitBounds(bounds,{padding:80,duration:1500});
}

// -------------------- Load route + matrix --------------------
async function loadRouteMatrix(shortName) {
    const { route, trip } = await getRouteWithShape(shortName);
    const stops = await getStopsForTrip(trip.trip_id);
    const shapeGeom = await getShapeGeometry(trip.shape_id) || await buildFallbackRoute(stops);
    drawRouteOnly(shapeGeom);
    const stopTimes = await calculateStopTimesMatrix(stops);
    renderStopsMatrix(stops, stopTimes);
}

// -------------------- Main --------------------
window.onload = async () => {
    try {
        await pullAPiKey();
        createMap();
        await loadRouteMatrix("1");
        setInterval(()=>loadRouteMatrix(1), updateIntervalMs);
    } catch(e) {
        console.error("Failed to load route:", e);
        alert('Failed to load route – verifică consola (F12)');
    }
};
