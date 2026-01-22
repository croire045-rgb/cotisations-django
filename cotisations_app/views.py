from django.shortcuts import render, redirect
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Cotisation
import json
from datetime import datetime
from decimal import Decimal


def login_view(request):
    if request.method == 'POST':
        password = request.POST.get('password')
        if password == settings.APP_PASSWORD:
            request.session['authenticated'] = True
            return redirect('dashboard')
        else:
            return render(request, 'cotisations/login.html', {
                'error': 'Mot de passe incorrect'
            })
    return render(request, 'cotisations/login.html')


def dashboard_view(request):
    if not request.session.get('authenticated'):
        return redirect('login')
    
    return render(request, 'cotisations/dashboard.html', {
        'emailjs_public_key': settings.EMAILJS_PUBLIC_KEY,
        'emailjs_service_id': settings.EMAILJS_SERVICE_ID,
        'emailjs_template_id': settings.EMAILJS_TEMPLATE_ID,
    })


def logout_view(request):
    request.session.flush()
    return redirect('login')


# ========== API ENDPOINTS ==========

@csrf_exempt
@require_http_methods(["GET"])
def api_get_cotisations(request):
    """API pour récupérer toutes les cotisations"""
    try:
        cotisations = Cotisation.objects.all()
        
        data = {}
        for c in cotisations:
            data[c.mois] = {
                'mananga': {
                    'paid': c.mananga_paye,
                    'amount': float(c.mananga_montant),
                    'date': c.mananga_date.strftime('%d/%m/%Y') if c.mananga_date else None
                },
                'prodiges': {
                    'paid': c.prodiges_paye,
                    'amount': float(c.prodiges_montant),
                    'date': c.prodiges_date.strftime('%d/%m/%Y') if c.prodiges_date else None
                }
            }
        
        return JsonResponse({
            'success': True,
            'data': data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def api_toggle_payment(request):
    """API pour basculer un paiement (payé/non payé)"""
    try:
        data = json.loads(request.body)
        month = data.get('month')
        person = data.get('person')
        amount = data.get('amount')
        
        # Extraire l'année du mois
        annee = int(month.split()[-1])
        
        # Trouver ou créer la cotisation
        cotisation, created = Cotisation.objects.get_or_create(
            mois=month,
            annee=annee
        )
        
        # Basculer le paiement
        if person == 'mananga':
            if cotisation.mananga_paye:
                # Repasser à non payé
                cotisation.mananga_paye = False
                cotisation.mananga_montant = 0
                cotisation.mananga_date = None
                action = 'unpaid'
            else:
                # Marquer comme payé
                cotisation.mananga_paye = True
                cotisation.mananga_montant = Decimal(str(amount))
                cotisation.mananga_date = datetime.now().date()
                action = 'paid'
                
        elif person == 'prodiges':
            if cotisation.prodiges_paye:
                # Repasser à non payé
                cotisation.prodiges_paye = False
                cotisation.prodiges_montant = 0
                cotisation.prodiges_date = None
                action = 'unpaid'
            else:
                # Marquer comme payé
                cotisation.prodiges_paye = True
                cotisation.prodiges_montant = Decimal(str(amount))
                cotisation.prodiges_date = datetime.now().date()
                action = 'paid'
        
        cotisation.save()
        
        # Retourner les données mises à jour
        return JsonResponse({
            'success': True,
            'action': action,
            'data': {
                'paid': cotisation.mananga_paye if person == 'mananga' else cotisation.prodiges_paye,
                'amount': float(cotisation.mananga_montant if person == 'mananga' else cotisation.prodiges_montant),
                'date': (cotisation.mananga_date if person == 'mananga' else cotisation.prodiges_date).strftime('%d/%m/%Y') if action == 'paid' else None
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def api_get_stats(request):
    """API pour récupérer les statistiques globales"""
    try:
        cotisations = Cotisation.objects.all()
        
        total_collected = 0
        mananga_paid_count = 0
        prodiges_paid_count = 0
        mananga_total_amount = 0
        prodiges_total_amount = 0
        
        for c in cotisations:
            if c.mananga_paye:
                total_collected += float(c.mananga_montant)
                mananga_total_amount += float(c.mananga_montant)
                mananga_paid_count += 1
            
            if c.prodiges_paye:
                total_collected += float(c.prodiges_montant)
                prodiges_total_amount += float(c.prodiges_montant)
                prodiges_paid_count += 1
        
        total_expected = 7200000
        remaining = total_expected - total_collected
        recovery_rate = (total_collected / total_expected * 100) if total_expected > 0 else 0
        
        return JsonResponse({
            'success': True,
            'stats': {
                'total_expected': total_expected,
                'total_collected': total_collected,
                'remaining': remaining,
                'recovery_rate': round(recovery_rate, 1),
                'mananga': {
                    'paid_count': mananga_paid_count,
                    'total_amount': mananga_total_amount,
                    'progress': round((mananga_paid_count / 36) * 100, 1)
                },
                'prodiges': {
                    'paid_count': prodiges_paid_count,
                    'total_amount': prodiges_total_amount,
                    'progress': round((prodiges_paid_count / 36) * 100, 1)
                }
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def api_check_year_completion(request):
    """API pour vérifier quelles années sont complètes"""
    try:
        cotisations = Cotisation.objects.all()
        
        # Organiser par année
        years_data = {2026: [], 2027: [], 2028: []}
        for c in cotisations:
            if c.annee in years_data:
                years_data[c.annee].append(c)
        
        # Vérifier la complétion
        completion = {}
        months_per_year = 12
        
        for year, cotis in years_data.items():
            # Une année est complète si tous les 12 mois ont les 2 paiements
            complete_months = 0
            for c in cotis:
                if c.mananga_paye and c.prodiges_paye:
                    complete_months += 1
            
            completion[year] = {
                'complete': complete_months == months_per_year,
                'complete_months': complete_months,
                'total_months': months_per_year
            }
        
        return JsonResponse({
            'success': True,
            'completion': completion
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@csrf_exempt
@require_http_methods(["GET"])
def api_export_excel(request):
    """API pour générer le CSV d'export"""
    try:
        from django.http import HttpResponse
        import csv
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="cotisations_{datetime.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Mois', 'Année', 'MANANGA Statut', 'MANANGA Montant', 'MANANGA Date', 
                        'PRODIGES Statut', 'PRODIGES Montant', 'PRODIGES Date'])
        
        cotisations = Cotisation.objects.all().order_by('annee', 'id')
        
        for c in cotisations:
            writer.writerow([
                c.mois,
                c.annee,
                'Payé' if c.mananga_paye else 'Non payé',
                float(c.mananga_montant) if c.mananga_paye else '',
                c.mananga_date.strftime('%d/%m/%Y') if c.mananga_date else '',
                'Payé' if c.prodiges_paye else 'Non payé',
                float(c.prodiges_montant) if c.prodiges_paye else '',
                c.prodiges_date.strftime('%d/%m/%Y') if c.prodiges_date else ''
            ])
        
        return response
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)