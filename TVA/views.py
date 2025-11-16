from django.shortcuts import render
from django.http import HttpResponse
from .helpers import get_bus_exact_data
def home(request):
    return render(request, 'public/index.html')

def restaurant_page(request):
    return render(request, 'public/restaurants.html')

def hotels_page(request):
    return render(request, 'public/hotels.html')

def bus_page(request):
    return render(request, 'public/bus.html')

async def bus_map(request, bus_id):
    bus_data = await get_bus_exact_data(bus_id)  # ✅ await the coroutine
    context = {
        'bus_id': bus_id,
        'bus_data': bus_data,
    }
    return render(request, 'public/bus_map.html', context)

def alerts_page(request):
    return render(request, 'public/alerts.html')

def weather_page(request):
    return render(request, 'public/weather.html')
def panel(request):
    return render(request, 'dashboard/panel.html')

def login(request):
    return render(request, 'components/login.html')

