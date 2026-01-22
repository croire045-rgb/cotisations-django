from django.contrib import admin
from .models import Cotisation


@admin.register(Cotisation)
class CotisationAdmin(admin.ModelAdmin):
    list_display = ('mois', 'annee', 'mananga_paye', 'mananga_montant', 'prodiges_paye', 'prodiges_montant')
    list_filter = ('annee', 'mananga_paye', 'prodiges_paye')
    search_fields = ('mois',)