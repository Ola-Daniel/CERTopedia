const fs = require('fs');
const path = require('path');

// Cache for CERT data
let certData = null;
let certDataTimestamp = 0;
const CACHE_TTL = 600000; // 10 minutes

function loadCertData() {
    const now = Date.now();

    if (certData && now - certDataTimestamp < CACHE_TTL) {
        return certData;
    }

    try {
        const dataPath = path.join(__dirname, '../data/certs.json');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        certData = JSON.parse(rawData);
        certDataTimestamp = now;

        console.log(`Loaded ${certData.length} CERT entries`);
        return certData;
    } catch (error) {
        console.error('Error loading CERT data:', error);
        return [];
    }
}

function validateCertData(data) {
    const requiredFields = [
        'country', 'name', 'fullName', 'website',
        'emergencyContact', 'email', 'established',
        'description', 'sector', 'verified', 'lastUpdated'
    ];

    return data.every(cert => {
        const hasRequiredFields = requiredFields.every(field =>
            Object.prototype.hasOwnProperty.call(cert, field) && cert[field] !== null && cert[field] !== undefined
        );

        const hasValidPgpKey = cert.pgpKey &&
      typeof cert.pgpKey.available === 'boolean' &&
      (cert.pgpKey.available === false ||
       (cert.pgpKey.keyId && typeof cert.pgpKey.keyId === 'string'));

        return hasRequiredFields && hasValidPgpKey;
    });
}

function filterCerts(certs, filters = {}) {
    let filtered = [...certs];

    // Filter by search term
    if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filtered = filtered.filter(cert =>
            cert.country.toLowerCase().includes(searchTerm) ||
      cert.name.toLowerCase().includes(searchTerm) ||
      cert.fullName.toLowerCase().includes(searchTerm) ||
      cert.sector.toLowerCase().includes(searchTerm) ||
      cert.description.toLowerCase().includes(searchTerm)
        );
    }

    // Filter by sector
    if (filters.sector && filters.sector !== 'all') {
        filtered = filtered.filter(cert =>
            cert.sector.toLowerCase() === filters.sector.toLowerCase()
        );
    }

    // Filter by country
    if (filters.country) {
        filtered = filtered.filter(cert =>
            cert.country.toLowerCase() === filters.country.toLowerCase()
        );
    }

    // Filter by PGP availability
    if (filters.pgp === 'true') {
        filtered = filtered.filter(cert =>
            cert.pgpKey && cert.pgpKey.available === true
        );
    }

    return filtered;
}

function getStats(certs) {
    const totalCerts = certs.length;
    const totalCountries = new Set(certs.map(cert => cert.country)).size;
    const sectorsCount = certs.reduce((acc, cert) => {
        acc[cert.sector] = (acc[cert.sector] || 0) + 1;
        return acc;
    }, {});

    const pgpEnabled = certs.filter(cert =>
        cert.pgpKey && cert.pgpKey.available
    ).length;

    const lastUpdated = certs.reduce((latest, cert) => {
        const certDate = new Date(cert.lastUpdated);
        return certDate > latest ? certDate : latest;
    }, new Date(0));

    return {
        totalCerts,
        totalCountries,
        sectorsCount,
        pgpEnabled,
        lastUpdated: lastUpdated.toISOString(),
        verificationRate: '100%'
    };
}

exports.handler = async (event) => {
    console.log('API Request:', JSON.stringify(event, null, 2));

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://cert.danieloo.com',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
    };

    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    };

    try {
        const { requestContext, rawPath, rawQueryString } = event;
        const method = requestContext.http.method;
        const apiPath = rawPath.replace('/api', '') || '/';

        // Parse query parameters
        const queryParams = new URLSearchParams(rawQueryString || '');
        const filters = {
            search: queryParams.get('search'),
            sector: queryParams.get('sector'),
            country: queryParams.get('country'),
            pgp: queryParams.get('pgp')
        };

        // Handle preflight OPTIONS requests
        if (method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders,
                    ...securityHeaders
                },
                body: ''
            };
        }

        // Only allow GET requests
        if (method !== 'GET') {
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                    ...securityHeaders
                },
                body: JSON.stringify({
                    error: 'Method Not Allowed',
                    message: `HTTP method ${method} is not supported`
                })
            };
        }

        // Load CERT data
        const certs = loadCertData();

        if (!certs || certs.length === 0) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                    ...securityHeaders
                },
                body: JSON.stringify({
                    error: 'Data Unavailable',
                    message: 'CERT data could not be loaded'
                })
            };
        }

        // Validate data integrity
        if (!validateCertData(certs)) {
            console.warn('CERT data validation failed');
        }

        let response;

        // Route handling
        switch (apiPath) {
        case '/':
        case '/certs': {
            const filteredCerts = filterCerts(certs, filters);
            response = {
                success: true,
                data: filteredCerts,
                total: filteredCerts.length,
                filters: Object.fromEntries(
                    Object.entries(filters).filter(([_, value]) => value !== null)
                )
            };
            break;
        }

        case '/stats':
            response = {
                success: true,
                data: getStats(certs)
            };
            break;

        case '/countries': {
            const countries = [...new Set(certs.map(cert => cert.country))]
                .sort()
                .map(country => ({
                    name: country,
                    count: certs.filter(cert => cert.country === country).length
                }));
            response = {
                success: true,
                data: countries
            };
            break;
        }

        case '/sectors': {
            const sectors = certs.reduce((acc, cert) => {
                if (!acc[cert.sector]) {
                    acc[cert.sector] = {
                        name: cert.sector,
                        count: 0,
                        certs: []
                    };
                }
                acc[cert.sector].count++;
                acc[cert.sector].certs.push({
                    name: cert.name,
                    country: cert.country
                });
                return acc;
            }, {});

            response = {
                success: true,
                data: Object.values(sectors)
            };
            break;
        }

        case '/health':
            response = {
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.API_VERSION || '1.0',
                dataStatus: {
                    certsLoaded: certs.length,
                    lastUpdate: certs.length > 0 ? Math.max(...certs.map(c => new Date(c.lastUpdated).getTime())) : 0
                }
            };
            break;

        default:
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                    ...securityHeaders
                },
                body: JSON.stringify({
                    error: 'Not Found',
                    message: `API endpoint ${apiPath} not found`
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': apiPath === '/health' ? 'no-cache' : 'public, max-age=300',
                ...corsHeaders,
                ...securityHeaders
            },
            body: JSON.stringify(response, null, 2)
        };

    } catch (error) {
        console.error('API handler error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
                ...securityHeaders
            },
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                timestamp: new Date().toISOString()
            })
        };
    }
};
