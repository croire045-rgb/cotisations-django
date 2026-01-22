// Configuration EmailJS
const EMAILJS_SERVICE_ID = document.getElementById('emailjs-config')?.dataset.serviceId;
const EMAILJS_TEMPLATE_ID = document.getElementById('emailjs-config')?.dataset.templateId;
const EMAILJS_PUBLIC_KEY = document.getElementById('emailjs-config')?.dataset.publicKey;

const MONTHS_BY_YEAR = {
    2026: ['Janvier 2026', 'Février 2026', 'Mars 2026', 'Avril 2026', 'Mai 2026', 'Juin 2026',
           'Juillet 2026', 'Août 2026', 'Septembre 2026', 'Octobre 2026', 'Novembre 2026', 'Décembre 2026'],
    2027: ['Janvier 2027', 'Février 2027', 'Mars 2027', 'Avril 2027', 'Mai 2027', 'Juin 2027',
           'Juillet 2027', 'Août 2027', 'Septembre 2027', 'Octobre 2027', 'Novembre 2027', 'Décembre 2027'],
    2028: ['Janvier 2028', 'Février 2028', 'Mars 2028', 'Avril 2028', 'Mai 2028', 'Juin 2028',
           'Juillet 2028', 'Août 2028', 'Septembre 2028', 'Octobre 2028', 'Novembre 2028', 'Décembre 2028']
};

let currentYear = 2026;
let cotisationsData = {};

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Application chargée');
    
    // Initialiser EmailJS
    if (EMAILJS_PUBLIC_KEY) {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }
    
    // Charger les données depuis l'API
    await loadCotisations();
    
    // Charger les stats
    await loadStats();
    
    // Vérifier la complétion des années
    await checkYearCompletion();
    
    // Configurer les événements
    setupEventListeners();
    
    // Afficher le tableau
    renderTable();
});

// Charger les cotisations depuis l'API
async function loadCotisations() {
    try {
        const response = await fetch('/api/cotisations/');
        const result = await response.json();
        
        if (result.success) {
            cotisationsData = result.data;
            console.log('✅ Cotisations chargées');
        }
    } catch (error) {
        console.error('❌ Erreur chargement:', error);
    }
}

// Charger les statistiques depuis l'API
async function loadStats() {
    try {
        const response = await fetch('/api/stats/');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            
            document.getElementById('totalCollected').textContent = 
                stats.total_collected.toLocaleString('fr-FR') + ' FCFA';
            document.getElementById('remaining').textContent = 
                stats.remaining.toLocaleString('fr-FR') + ' FCFA';
            document.getElementById('recoveryRate').textContent = 
                stats.recovery_rate + '%';
            
            // Stats MANANGA
            document.getElementById('manangaPaid').textContent = 
                `${stats.mananga.paid_count} / 36`;
            document.getElementById('manangaTotal').textContent = 
                stats.mananga.total_amount.toLocaleString('fr-FR') + ' FCFA';
            document.getElementById('manangaProgress').style.width = 
                stats.mananga.progress + '%';
            
            // Stats PRODIGES
            document.getElementById('prodigesPaid').textContent = 
                `${stats.prodiges.paid_count} / 36`;
            document.getElementById('prodigesTotal').textContent = 
                stats.prodiges.total_amount.toLocaleString('fr-FR') + ' FCFA';
            document.getElementById('prodigesProgress').style.width = 
                stats.prodiges.progress + '%';
            
            console.log('✅ Statistiques mises à jour');
        }
    } catch (error) {
        console.error('❌ Erreur stats:', error);
    }
}

// Vérifier la complétion des années
async function checkYearCompletion() {
    try {
        const response = await fetch('/api/year-completion/');
        const result = await response.json();
        
        if (result.success) {
            const completion = result.completion;
            
            // Année 2027
            const year2027Btn = document.querySelector('[data-year="2027"]');
            if (completion['2026'].complete) {
                year2027Btn.disabled = false;
                year2027Btn.querySelector('.lock-icon').textContent = '✓';
            }
            
            // Année 2028
            const year2028Btn = document.querySelector('[data-year="2028"]');
            if (completion['2027'].complete) {
                year2028Btn.disabled = false;
                year2028Btn.querySelector('.lock-icon').textContent = '✓';
            }
            
            // Message d'alerte
            updateAlertMessage(completion);
        }
    } catch (error) {
        console.error('❌ Erreur complétion:', error);
    }
}

function updateAlertMessage(completion) {
    const alertContainer = document.getElementById('alertContainer');
    const currentYearData = completion[currentYear];
    
    if (!currentYearData.complete && currentYear < 2028) {
        const nextYear = currentYear + 1;
        alertContainer.innerHTML = `
            <div class="alert-message">
                ⚠️ Complétez tous les paiements de ${currentYear} pour débloquer l'année ${nextYear}
            </div>
        `;
    } else if (currentYearData.complete && currentYear < 2028) {
        alertContainer.innerHTML = `
            <div class="alert-message" style="background: #dcfce7; border-color: #10b981; color: #065f46;">
                ✅ Année ${currentYear} complète ! Vous pouvez passer à l'année suivante.
            </div>
        `;
    } else {
        alertContainer.innerHTML = '';
    }
}

function setupEventListeners() {
    // Boutons d'année
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled) {
                selectYear(parseInt(this.dataset.year));
            }
        });
    });
}

function selectYear(year) {
    currentYear = year;
    
    // Mettre à jour les boutons
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.year) === year) {
            btn.classList.add('active');
        }
    });
    
    document.getElementById('tableYearTitle').textContent = `Registre ${year}`;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    const months = MONTHS_BY_YEAR[currentYear];
    
    months.forEach(month => {
        const data = cotisationsData[month] || {
            mananga: { paid: false, amount: 0, date: null },
            prodiges: { paid: false, amount: 0, date: null }
        };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${month}</strong></td>
            <td>
                <button class="status-btn ${data.mananga.paid ? 'paid' : 'unpaid'}" 
                        onclick="togglePayment('${month}', 'mananga')">
                    ${data.mananga.paid ? '✓ Payé' : '✗ Non payé'}
                </button>
            </td>
            <td>
                <strong style="color: ${data.mananga.paid ? '#10b981' : '#6b7280'};">
                    ${data.mananga.paid ? data.mananga.amount.toLocaleString('fr-FR') + ' FCFA' : '-'}
                </strong>
            </td>
            <td>
                <span style="color: #3b82f6; font-size: 0.9rem; font-style: italic;">
                    ${data.mananga.date || '-'}
                </span>
            </td>
            <td>
                <button class="status-btn ${data.prodiges.paid ? 'paid' : 'unpaid'}" 
                        onclick="togglePayment('${month}', 'prodiges')">
                    ${data.prodiges.paid ? '✓ Payé' : '✗ Non payé'}
                </button>
            </td>
            <td>
                <strong style="color: ${data.prodiges.paid ? '#10b981' : '#6b7280'};">
                    ${data.prodiges.paid ? data.prodiges.amount.toLocaleString('fr-FR') + ' FCFA' : '-'}
                </strong>
            </td>
            <td>
                <span style="color: #3b82f6; font-size: 0.9rem; font-style: italic;">
                    ${data.prodiges.date || '-'}
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

async function togglePayment(month, person) {
    const data = cotisationsData[month] || {
        mananga: { paid: false, amount: 0, date: null },
        prodiges: { paid: false, amount: 0, date: null }
    };
    
    if (!data[person].paid) {
        // Demander le montant
        const amount = prompt(`💰 Entrez le montant de la cotisation (${month}):`, '100000');
        
        if (amount === null) return;
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('⚠️ Veuillez entrer un montant valide');
            return;
        }
        
        // Appeler l'API pour enregistrer
        await savePayment(month, person, parsedAmount);
        
    } else {
        // Confirmer avant de repasser à non payé
        if (confirm('Voulez-vous marquer ce paiement comme non payé ?')) {
            await savePayment(month, person, 0);
        }
    }
}

async function savePayment(month, person, amount) {
    try {
        const response = await fetch('/api/toggle-payment/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                month: month,
                person: person,
                amount: amount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Paiement enregistré');
            
            // Mettre à jour les données locales
            if (!cotisationsData[month]) {
                cotisationsData[month] = {
                    mananga: { paid: false, amount: 0, date: null },
                    prodiges: { paid: false, amount: 0, date: null }
                };
            }
            cotisationsData[month][person] = result.data;
            
            // Rafraîchir l'affichage
            renderTable();
            await loadStats();
            await checkYearCompletion();
            
            // Envoyer email si paiement effectué
            if (result.action === 'paid') {
                sendPaymentNotification(person, month, amount);
            }
            
        } else {
            alert('Erreur: ' + result.error);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

function sendPaymentNotification(person, month, amount) {
    const config = {
        mananga: {
            name: 'MANANGA KIBANGOU Prévis Croire',
            notifyEmail: 'prodigesbadingoussou@gmail.com',
            notifyName: 'BADINGOUSSOU-PEMBA Splendeurs Prodiges'
        },
        prodiges: {
            name: 'BADINGOUSSOU-PEMBA Splendeurs Prodiges',
            notifyEmail: 'croire045@gmail.com',
            notifyName: 'MANANGA KIBANGOU Prévis Croire'
        }
    };
    
    const personConfig = config[person];
    const now = new Date();
    
    // Calculer les stats pour l'email
    fetch('/api/stats/')
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                const stats = result.stats;
                
                const templateParams = {
                    to_email: personConfig.notifyEmail,
                    to_name: personConfig.notifyName,
                    from_name: personConfig.name,
                    month: month,
                    amount: amount.toLocaleString('fr-FR'),
                    date: now.toLocaleDateString('fr-FR'),
                    time: now.toLocaleTimeString('fr-FR'),
                    total_collected: stats.total_collected.toLocaleString('fr-FR'),
                    total_expected: stats.total_expected.toLocaleString('fr-FR'),
                    recovery_rate: stats.recovery_rate,
                    remaining: stats.remaining.toLocaleString('fr-FR')
                };
                
                emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
                    .then(() => {
                        console.log('✅ Email envoyé');
                        showNotification(`✅ Notification envoyée à ${personConfig.notifyName}`, 'success');
                    })
                    .catch(error => {
                        console.error('❌ Erreur email:', error);
                    });
            }
        });
}

function showNotification(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const colors = {
        success: { bg: '#dcfce7', border: '#10b981', text: '#065f46' },
        error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' }
    };
    
    const color = colors[type] || colors.success;
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${color.bg};
        border-left: 4px solid ${color.border};
        color: ${color.text};
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    alertContainer.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function exportToExcel() {
    window.location.href = '/api/export/';
}