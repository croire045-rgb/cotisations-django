from django.db import models


class Cotisation(models.Model):
    mois = models.CharField(max_length=50)
    annee = models.IntegerField()
    mananga_paye = models.BooleanField(default=False)
    mananga_montant = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mananga_date = models.DateField(null=True, blank=True)
    prodiges_paye = models.BooleanField(default=False)
    prodiges_montant = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    prodiges_date = models.DateField(null=True, blank=True)
    
    class Meta:
        unique_together = ('mois', 'annee')
        ordering = ['annee', 'id']
    
    def __str__(self):
        return f"{self.mois} {self.annee}"