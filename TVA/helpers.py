import asyncio
import aiohttp
from datetime import timedelta

# API Keys
TRANZY_KEY = "oiz1qIwwgJH2WOfybG3uWmRQf0wt5D7RRqTBpgU8"
MATRIX_KEY = "fCTS6ewdZ4JPCMc0ws7hgQM2WZgEyBNfQX7GLmbP7pyRkZxvLpJbAVE85SSb93f0"

# Tranzy endpoints
BASE = "https://api.tranzy.ai/v1/opendata"
URL_ROUTES = f"{BASE}/routes"
URL_TRIPS = f"{BASE}/trips"
URL_STOP_TIMES = f"{BASE}/stop_times"
URL_STOPS = f"{BASE}/stops"

MATRIX_URL = "https://api.distancematrix.ai/maps/api/distancematrix/json"

HEADERS = {
    "X-Agency-Id": "8",
    "Accept": "application/json",
    "X-API-KEY": TRANZY_KEY
}

# ---------------- Tranzy helpers ----------------
async def fetch_json(session, url):
    async with session.get(url, headers=HEADERS) as resp:
        resp.raise_for_status()
        return await resp.json()

async def get_stations_for_route_short_name(short_name):
    async with aiohttp.ClientSession() as session:
        routes = await fetch_json(session, URL_ROUTES)
        match = [r for r in routes if r["route_short_name"] == short_name]
        if not match:
            raise ValueError(f"No route found with route_short_name={short_name}")

        route_id = match[0]["route_id"]

        trips = await fetch_json(session, URL_TRIPS)
        trip_match = [t for t in trips if t["route_id"] == route_id]
        if not trip_match:
            raise ValueError("No trips found for this route")

        trip_id = trip_match[0]["trip_id"]

        stop_times = await fetch_json(session, URL_STOP_TIMES)
        stop_sequence = sorted(
            [s for s in stop_times if s["trip_id"] == trip_id],
            key=lambda x: x["stop_sequence"]
        )
        stop_ids = [s["stop_id"] for s in stop_sequence]

        stops = await fetch_json(session, URL_STOPS)
        final_stations = [
            {"name": s["stop_name"], "lat": s["stop_lat"], "lon": s["stop_lon"]}
            for s in stops if s["stop_id"] in stop_ids
        ]

        return final_stations

# ---------------- DistanceMatrix helper ----------------
async def get_travel_time(session, origin, destination):
    params = {
        "origins": origin,
        "destinations": destination,
        "mode": "driving",
        "departure_time": "now",
        "key": MATRIX_KEY
    }
    async with session.get(MATRIX_URL, params=params) as resp:
        resp.raise_for_status()
        data = await resp.json()
        if data.get("status") != "OK":
            raise ValueError(f"Matrix error: {data}")
        element = data["rows"][0]["elements"][0]
        return element["duration"]["value"]

# ---------------- Main: calculate stop times in parallel ----------------
async def calculate_stop_to_stop_times(stations):
    results = []
    total_seconds = 0

    async with aiohttp.ClientSession() as session:
        tasks = []
        # Prepare all tasks in parallel
        for i in range(len(stations) - 1):
            a = stations[i]
            b = stations[i + 1]
            origin = f"{a['lat']},{a['lon']}"
            dest = f"{b['lat']},{b['lon']}"
            tasks.append(get_travel_time(session, origin, dest))

        # Gather all results concurrently
        durations = await asyncio.gather(*tasks)

        for i, secs in enumerate(durations):
            a = stations[i]
            b = stations[i + 1]
            total_seconds += secs
            results.append({
                "from": a["name"],
                "to": b["name"],
                "seconds": secs,
                "cumulative": total_seconds
            })

    return results

# ---------------- Convenience function ----------------
async def get_bus_exact_data(route_short_name):
    stations = await get_stations_for_route_short_name(route_short_name)
    stop_times = await calculate_stop_to_stop_times(stations)
    return stop_times

# ---------------- Example usage ----------------
if __name__ == "__main__":
    route = "E8"
    stop_times = asyncio.run(get_bus_exact_data(route))
    for t in stop_times:
        print(f"{t['from']} → {t['to']}: {t['seconds']}s (cumulative {t['cumulative']}s)")
