from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('restaurants/', views.restaurant_page, name='restaurant_page'),
    path('hotels/', views.hotels_page, name='hotels_page'),
    path('bus/', views.bus_page, name='bus_page'),
    path('trips/<str:bus_id>', views.bus_map, name='bus_route'),


    path('alerts/', views.alerts_page, name='alerts_page'),
    path('weather/', views.weather_page, name='weather_page'),
    # path('restaurants/', views.city_page, name='city_page'),

    path('login/', views.login, name='login'),
    path('panel/', views.panel, name=' panel'),

]