
const minLon = 21.1350;
const minLat = 45.7100;
const maxLon = 21.3200;
const maxLat = 45.8050;

const hotelCategory = "accommodation.hotel";

const maxResults = 20;
let geoapifyApiKey = '';

/* ---------- 1. Read API key from package.json (dev only) ---------- */
async function pullAPiKey() {
    const r = await fetch('/static/js/package.json');
    if (!r.ok) throw new Error('package.json missing');
    const d = await r.json();
    geoapifyApiKey = d.geoapifyApiKey;
    if (!geoapifyApiKey) throw new Error('Geoapify API key missing');
}

/* ---------- 2. Fetch hotels from Geoapify ---------- */
async function fetchHotels() {
    try {
        await pullAPiKey();

        const url = `https://api.geoapify.com/v2/places?` +
            `categories=${hotelCategory}` +
            `&filter=rect:${minLon},${maxLat},${maxLon},${minLat}` +
            `&limit=${maxResults}` +
            `&apiKey=${geoapifyApiKey}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const hotels = data.features.map(f => {
            const p = f.properties;
            const raw = p.datasource?.raw || {};

            // ---- basic fields ----
            const name = p.name || 'N/A';
            const street = p.street || 'N/A';
            const housenumber = p.housenumber || 'N/A';
            const email = raw.email || p.email || 'N/A';

            // ---- rooms – default to 10 if unknown ----
            const roomsRaw = raw.rooms ?? p.rooms;
            const rooms = roomsRaw != null ? `${roomsRaw} Rooms` : '10 Rooms';

            // ---- description ----
            // const description = raw.description || p.description || 'No Description.';
            const description= "No Description.";

            return { name, street, housenumber, email, rooms, description };
        });

        localStorage.setItem('hotels', JSON.stringify(hotels));
        renderCards(hotels);
    } catch (e) {
        console.error('fetchHotels error →', e);
    }
}

/* ---------- 3. Render cards ---------- */
function renderCards(list) {
    const container = document.getElementById('hotelsSection');
    container.innerHTML = '';

    list.forEach(h => {
        const card = document.createElement('div');
        card.className = 'hotels-card';

        card.innerHTML = `
            <div class="hotels-background">
                <img class="hotels-background-image"
                     src="https://picsum.photos/400/300?random=${Math.random()}"
                     alt="Imagine hotel">
            </div>
            <div class="hotels-info-container">
                <div class="hotels-name">
                    <p class="hotels-name-text">${h.name}</p>
                </div>
                <div class="hotels-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${h.street}, nr. ${h.housenumber}
                </div>
                <div class="hotels-email">
                    <i class="fa-solid fa-envelope"></i>
                    ${h.email}
                </div>
                <div class="hotels-rooms">
                    <i class="fa-solid fa-bed"></i>
                    ${h.rooms}
                </div>
                <br>
                <div class="hotels-description">
                    ${h.description}
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

/* ---------- 4. Init on page load ---------- */
window.addEventListener('load', () => {
    const stored = localStorage.getItem('hotels');
    if (stored) renderCards(JSON.parse(stored));
    fetchHotels();
});