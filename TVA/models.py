from django.db import models

# Create your models here.
class Vehicul(models.Model):
    nume = models.CharField(max_length=100)
    shift_start = models.TextField(max_length=500)
    shift_end = models.TextField(max_length=500)

    def delete_vehicul(self):
        self.delete()

    def update_vehicul(self, nume, shift_start, shift_end):
        self.nume = nume
        self.shift_start = shift_start
        self.shift_end = shift_end

class Alerts(models.Model):
    title = models.TextField(max_length=500)
    description = models.TextField(max_length=1000)
    type = models.TextField(max_length=500)

class Complaints(models.Model):
    AREA_CHOICES = [
        ('piata-victoriei', 'Piața Victoriei'),
        ('piata-unirii', 'Piața Unirii'),
        ('piata-libertatii', 'Piața Libertății'),
        ('complexul-studentesc', 'Complexul Studențesc'),
        ('calea-girocului', 'Calea Girocului'),
        ('bd-take-ionescu', 'Bulevardul Take Ionescu'),
        ('calea-buziasului', 'Calea Buziașului'),
        ('iulius-town', 'Iulius Town'),
        ('garii', 'Gării'),
        ('cetatii', 'Cetății'),
        ('calea-aradului', 'Calea Aradului'),
        ('dacia', 'Dacia'),
        ('circumvalatiunii', 'Circumvalațiunii'),
        ('fabric', 'Fabric'),
        ('mehala', 'Mehala'),
        ('other', 'Other'),
    ]
    CATEGORY_CHOICES = [
        ('emergency', '⚠️ Emergency'),
        ('infrastructure', '🛠️ Infrastructure'),
        ('weather', '🌧️ Weather'),
        ('public-safety', '🚓 Public Safety'),
        ('health', '🏥 Health'),
        ('traffic', '🚦 Traffic'),
    ]

    first_name = models.TextField(max_length=500)
    last_name = models.TextField(max_length=500)
    email = models.TextField(max_length=500)

    area = models.CharField(max_length=50, choices=AREA_CHOICES)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(max_length=1000)

    def update_alert(self, first_name, last_name, email, area, category, description):
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.area = area
        self.category = category
        self.description = description

    def delete_alert(self):
        self.delete()

class Login(models.Model):
    username = models.CharField(max_length=20)
    password = models.CharField(max_length=20)