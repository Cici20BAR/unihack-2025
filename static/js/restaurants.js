const minLon = 21.1350;
const minLat = 45.7100;
const maxLon = 21.3200;
const maxLat = 45.8050;

const restaurantCategory = "catering.restaurant";

const maxResults = 20;

let geoapifyApiKey = '';

async function pullAPiKey() {
    const r = await fetch('/static/js/package.json');
    if (!r.ok) throw new Error('package.json missing');
    const d = await r.json();
    geoapifyApiKey = d.geoapifyApiKey;
    if (!geoapifyApiKey) throw new Error('Geoapify API key missing');
}

async function fetchRestaurants() {
    try {
        await pullAPiKey();
        const url = `https://api.geoapify.com/v2/places?categories=${restaurantCategory}&filter=rect:${minLon},${maxLat},${maxLon},${minLat}&limit=${maxResults}&apiKey=${geoapifyApiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const restaurants = data.features.map(f => {
            const p = f.properties;
            const raw = p.datasource?.raw || {};
            let cuisine = raw.cuisine || p.cuisine || null;
            if (cuisine === 'none' || cuisine === '' || cuisine === null) cuisine = 'average';

            return {
                name: p.name || null,
                street: p.street || null,
                housenumber: p.housenumber || null,
                phone: raw.phone || null,
                cuisine: cuisine,
                opening_hours: p.opening_hours || raw.opening_hours || null
            };
        }).filter(r =>
            r.name && r.street && r.housenumber && r.phone && r.opening_hours
        );

        localStorage.setItem("restaurants", JSON.stringify(restaurants));
        renderCards(restaurants);
    } catch (e) {
        console.error(e);
    }
}

function renderCards(list) {
    const container = document.getElementById('restaurantsSection');
    container.innerHTML = '';

    list.forEach(r => {
        const card = document.createElement('div');
        card.className = 'restaurants-card';

        card.innerHTML = `
            <div class="restaurant-background">
                <img class="restaurant-background-image" src="https://picsum.photos/400/300?random=${Math.random()}" alt="">
            </div>
            <div class="restaurants-info-container">
                <div class="restaurants-name">
                    <p class="restaurant-name-text">${r.name}</p>
                </div>
                <div class="restaurants-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${r.street}, nr. ${r.housenumber}
                </div>
                <div class="restaurants-phone-number">
                    <i class="fa-solid fa-phone"></i>
                    ${r.phone}
                </div>
                <div class="restaurants-icon">
                    <i class="fa-solid fa-bowl-food"></i>
                    Food type: ${r.cuisine}
                </div>
                <div class="restaurants-description">
                    <i class="fa-sharp fa-solid fa-clock"></i>
                    Open hours: ${r.opening_hours}
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

window.onload = () => {
    const stored = localStorage.getItem("restaurants");
    if (stored) {
        const data = JSON.parse(stored).map(r => {
            if (!r.cuisine || r.cuisine === 'none' || r.cuisine === '') r.cuisine = 'average';
            return r;
        }).filter(r =>
            r.name && r.street && r.housenumber && r.phone && r.opening_hours
        );
        renderCards(data);
    }
    fetchRestaurants();
};