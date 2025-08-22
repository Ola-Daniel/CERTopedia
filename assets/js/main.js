class CERTopedia {
    constructor() {
        this.certs = [];
        this.filteredCerts = [];
        this.currentFilters = {
            search: '',
            sector: ''
        };
        
        this.init();
    }
    
    async init() {
        await this.loadCerts();
        this.setupEventListeners();
        this.updateStats();
        this.renderCerts();
        this.hideLoading();
    }
    
    async loadCerts() {
        try {
            const response = await fetch('data/certs.json');
            if (!response.ok) throw new Error('Failed to load CERT data');
            
            this.certs = await response.json();
            this.filteredCerts = [...this.certs];
            
            // Sort by country name
            this.certs.sort((a, b) => a.country.localeCompare(b.country));
            this.filteredCerts.sort((a, b) => a.country.localeCompare(b.country));
        } catch (error) {
            console.error('Error loading CERT data:', error);
            this.showError('Failed to load CERT directory. Please try again later.');
        }
    }
    
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }
        
        // Sector filter
        const sectorFilter = document.getElementById('sector-filter');
        if (sectorFilter) {
            sectorFilter.addEventListener('change', (e) => {
                this.currentFilters.sector = e.target.value;
                this.applyFilters();
            });
        }
        
        // Clear filters
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearFilters();
            });
        }
        
        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Header scroll effect
        this.setupHeaderScroll();
    }
    
    setupHeaderScroll() {
        let lastScrollY = window.scrollY;
        const header = document.querySelector('.header');
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = 'none';
            }
            
            lastScrollY = currentScrollY;
        });
    }
    
    applyFilters() {
        const { search, sector } = this.currentFilters;
        
        this.filteredCerts = this.certs.filter(cert => {
            const matchesSearch = !search || 
                cert.country.toLowerCase().includes(search.toLowerCase()) ||
                cert.name.toLowerCase().includes(search.toLowerCase()) ||
                cert.fullName.toLowerCase().includes(search.toLowerCase()) ||
                cert.sector.toLowerCase().includes(search.toLowerCase());
            
            const matchesSector = !sector || cert.sector === sector;
            
            return matchesSearch && matchesSector;
        });
        
        this.renderCerts();
        this.toggleNoResults();
    }
    
    clearFilters() {
        this.currentFilters = { search: '', sector: '' };
        
        const searchInput = document.getElementById('search-input');
        const sectorFilter = document.getElementById('sector-filter');
        
        if (searchInput) searchInput.value = '';
        if (sectorFilter) sectorFilter.value = '';
        
        this.filteredCerts = [...this.certs];
        this.renderCerts();
        this.toggleNoResults();
    }
    
    renderCerts() {
        const certGrid = document.getElementById('cert-grid');
        if (!certGrid) return;
        
        if (this.filteredCerts.length === 0) {
            certGrid.innerHTML = '';
            return;
        }
        
        certGrid.innerHTML = this.filteredCerts.map(cert => this.createCertCard(cert)).join('');
        
        // Add click analytics (optional)
        this.setupCertCardAnalytics();
    }
    
    createCertCard(cert) {
        const flag = this.getCountryFlag(cert.country);
        const establishedYear = new Date(cert.established).getFullYear() || cert.established;
        
        return `
            <div class="cert-card" data-country="${cert.country}" data-sector="${cert.sector}">
                <div class="cert-badge">✓ Verified</div>
                <div class="cert-header">
                    <div class="cert-flag">${flag}</div>
                    <div class="cert-info">
                        <h3>${this.escapeHtml(cert.name)}</h3>
                        <div class="cert-country">${this.escapeHtml(cert.country)}</div>
                    </div>
                </div>
                
                <div class="cert-details">
                    <div class="cert-detail">
                        <span class="cert-detail-icon">🏢</span>
                        <span class="cert-detail-text">${this.escapeHtml(cert.fullName)}</span>
                    </div>
                    <div class="cert-detail">
                        <span class="cert-detail-icon">📞</span>
                        <span class="cert-detail-text">${this.escapeHtml(cert.emergencyContact)}</span>
                    </div>
                    <div class="cert-detail">
                        <span class="cert-detail-icon">📧</span>
                        <span class="cert-detail-text">${this.escapeHtml(cert.email)}</span>
                    </div>
                    <div class="cert-detail">
                        <span class="cert-detail-icon">📅</span>
                        <span class="cert-detail-text">Est. ${establishedYear}</span>
                    </div>
                    <div class="cert-detail">
                        <span class="cert-detail-icon">🏷️</span>
                        <span class="cert-detail-text">${this.escapeHtml(cert.sector)}</span>
                    </div>
                    ${cert.pgpKey && cert.pgpKey.available ? `
                    <div class="cert-detail">
                        <span class="cert-detail-icon">🔐</span>
                        <span class="cert-detail-text">PGP Key: ${this.escapeHtml(cert.pgpKey.keyId)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <p class="cert-description">${this.escapeHtml(cert.description)}</p>
                
                ${cert.pgpKey && cert.pgpKey.available ? `
                <div class="cert-pgp">
                    <div class="pgp-header">
                        <span class="pgp-icon">🔐</span>
                        <span class="pgp-title">PGP Encryption Available</span>
                    </div>
                    <div class="pgp-details">
                        <div class="pgp-field">
                            <span class="pgp-label">Key ID:</span>
                            <code class="pgp-value">${this.escapeHtml(cert.pgpKey.keyId)}</code>
                        </div>
                        ${cert.pgpKey.fingerprint ? `
                        <div class="pgp-field">
                            <span class="pgp-label">Fingerprint:</span>
                            <code class="pgp-value pgp-fingerprint">${this.escapeHtml(cert.pgpKey.fingerprint)}</code>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
                
                <div class="cert-actions">
                    <a href="${this.escapeHtml(cert.website)}" target="_blank" rel="noopener noreferrer" class="cert-action">
                        🌐 Visit Website
                    </a>
                    <a href="mailto:${this.escapeHtml(cert.email)}" class="cert-action">
                        📧 Send Email
                    </a>
                    <a href="tel:${this.escapeHtml(cert.emergencyContact)}" class="cert-action">
                        📞 Call Emergency
                    </a>
                </div>
            </div>
        `;
    }
    
    setupCertCardAnalytics() {
        document.querySelectorAll('.cert-action').forEach(link => {
            link.addEventListener('click', (e) => {
                const action = e.target.textContent.trim();
                const certCard = e.target.closest('.cert-card');
                const country = certCard?.dataset.country;
                
                // You can implement analytics tracking here
                console.log('CERT Action:', { action, country });
            });
        });
    }
    
    updateStats() {
        const certCount = document.getElementById('cert-count');
        const countryCount = document.getElementById('country-count');
        
        if (certCount) {
            this.animateNumber(certCount, this.certs.length);
        }
        
        if (countryCount) {
            const uniqueCountries = new Set(this.certs.map(cert => cert.country)).size;
            this.animateNumber(countryCount, uniqueCountries);
        }
    }
    
    animateNumber(element, target) {
        const duration = 1000;
        const start = performance.now();
        const startValue = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(startValue + (target - startValue) * this.easeOutQuart(progress));
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }
    
    toggleNoResults() {
        const noResults = document.getElementById('no-results');
        const certGrid = document.getElementById('cert-grid');
        
        if (this.filteredCerts.length === 0) {
            if (noResults) noResults.style.display = 'block';
            if (certGrid) certGrid.style.display = 'none';
        } else {
            if (noResults) noResults.style.display = 'none';
            if (certGrid) certGrid.style.display = 'grid';
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            setTimeout(() => {
                loading.style.display = 'none';
            }, 500);
        }
    }
    
    showError(message) {
        const certGrid = document.getElementById('cert-grid');
        const loading = document.getElementById('loading');
        
        if (loading) loading.style.display = 'none';
        if (certGrid) {
            certGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--error-color);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Error Loading CERT Directory</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    getCountryFlag(country) {
        const flagMap = {
            'Australia': '🇦🇺',
            'Canada': '🇨🇦',
            'Germany': '🇩🇪',
            'United Kingdom': '🇬🇧',
            'United States': '🇺🇸',
            'Japan': '🇯🇵',
            'France': '🇫🇷',
            'Netherlands': '🇳🇱',
            'Singapore': '🇸🇬',
            'South Korea': '🇰🇷',
            'Brazil': '🇧🇷',
            'India': '🇮🇳',
            'China': '🇨🇳',
            'Russia': '🇷🇺',
            'South Africa': '🇿🇦',
            'Mexico': '🇲🇽',
            'Italy': '🇮🇹',
            'Spain': '🇪🇸',
            'Sweden': '🇸🇪',
            'Norway': '🇳🇴',
            'Finland': '🇫🇮',
            'Denmark': '🇩🇰',
            'Belgium': '🇧🇪',
            'Switzerland': '🇨🇭',
            'Austria': '🇦🇹',
            'Poland': '🇵🇱',
            'Czech Republic': '🇨🇿',
            'Hungary': '🇭🇺',
            'Romania': '🇷🇴',
            'Bulgaria': '🇧🇬',
            'Croatia': '🇭🇷',
            'Serbia': '🇷🇸',
            'Ukraine': '🇺🇦',
            'Turkey': '🇹🇷',
            'Israel': '🇮🇱',
            'Saudi Arabia': '🇸🇦',
            'United Arab Emirates': '🇦🇪',
            'Egypt': '🇪🇬',
            'Nigeria': '🇳🇬',
            'Kenya': '🇰🇪',
            'Thailand': '🇹🇭',
            'Malaysia': '🇲🇾',
            'Indonesia': '🇮🇩',
            'Philippines': '🇵🇭',
            'Vietnam': '🇻🇳',
            'New Zealand': '🇳🇿',
            'Chile': '🇨🇱',
            'Argentina': '🇦🇷',
            'Colombia': '🇨🇴',
            'Peru': '🇵🇪'
        };
        
        return flagMap[country] || '🏴';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Utility functions for enhanced user experience
class CERTUtilities {
    static formatPhoneNumber(phone) {
        // Simple phone number formatting
        return phone.replace(/[^\d+\-\(\)\s]/g, '');
    }
    
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            return new Promise((resolve, reject) => {
                if (document.execCommand('copy')) {
                    resolve();
                } else {
                    reject();
                }
                textArea.remove();
            });
        }
    }
    
    static showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            z-index: 9999;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
        });
        
        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateY(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CERTopedia();
});

// Add copy functionality to contact information
document.addEventListener('click', (e) => {
    if (e.target.closest('.cert-action') && e.ctrlKey) {
        e.preventDefault();
        const link = e.target.closest('.cert-action');
        let textToCopy = '';
        
        if (link.href.startsWith('mailto:')) {
            textToCopy = link.href.replace('mailto:', '');
        } else if (link.href.startsWith('tel:')) {
            textToCopy = link.href.replace('tel:', '');
        } else {
            textToCopy = link.href;
        }
        
        CERTUtilities.copyToClipboard(textToCopy)
            .then(() => CERTUtilities.showToast('Copied to clipboard!', 'success'))
            .catch(() => CERTUtilities.showToast('Failed to copy', 'error'));
    }
});

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}