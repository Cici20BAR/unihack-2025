from django import forms
from .models import Vehicul, Alerts, Complaints, Login

class VehiculForm(forms.ModelForm):
    class Meta:
        model = Vehicul
        fields = '__all__'

class AlertsForm(forms.ModelForm):
    class Meta:
        model = Alerts
        fields = '__all__'

class ComplaintsForm(forms.ModelForm):
    class Meta:
        model = Complaints
        fields = '__all__'

class LoginForm(forms.ModelForm):
    class Meta:
        model = Login
        fields = '__all__'