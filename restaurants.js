const minLon = 21.1350;
const minLat = 45.7100;
const maxLon = 21.3200;
const maxLat = 45.8050;

const agencyId = 8;
const restaurantCategory = "catering.restaurant";

const urlRestaurants = `https://api.geoapify.com/v2/places?categories=${restaurantCategory}&filter=rect:${minLon},${maxLat},${maxLon},${minLat}&limit=${maxResults}&apiKey=${apiKey}`;

let geoapifyApiKey = '';
let tranzyApiKey   = '';
let map            = null;

const maxRestaurants = 20;

async function pullAPiKey() {
    const r = await fetch('package.json');
    if (!r.ok) throw new Error('package.json missing');
    const d = await r.json();
    tranzyApiKey   = d.tranzyApiKey;
    if (!tranzyApiKey) throw new Error('API keys missing');
}

fetch(urlRestaurants)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const restaurants = []; // To store all restaurant objects

        data.features.forEach(restaurant => {
            const name = restaurant.properties.name || "N/A";
            const openHours = restaurant.properties.opening_hours || "N/A";
            const cuisine = restaurant.properties.datasource?.raw?.cuisine || "N/A";
            const restaurantData = {
                name,
                openHours,
                cuisine
            };

            restaurants.push(restaurantData);
        });

        // Save the entire array of restaurants to localStorage
        localStorage.setItem("restaurants", JSON.stringify(restaurants));
        console.log("Saved restaurants to localStorage:", restaurants);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });

