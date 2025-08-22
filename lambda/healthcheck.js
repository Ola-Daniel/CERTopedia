exports.handler = async (event) => {
    console.log('Health check request:', JSON.stringify(event, null, 2));

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    };

    try {
        const { requestContext } = event;
        const method = requestContext.http.method;

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

        if (method !== 'GET') {
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                    ...securityHeaders
                },
                body: JSON.stringify({
                    error: 'Method Not Allowed'
                })
            };
        }

        // Perform health checks
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'CERTopedia',
            version: process.env.API_VERSION || '1.0.0',
            stage: process.env.STAGE || 'prod',
            region: process.env.AWS_REGION || 'unknown',
            checks: {
                lambda: 'ok',
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                uptime: Math.round(process.uptime()),
                environment: process.env.NODE_ENV || 'unknown'
            }
        };

        // Check if we can access the data file
        try {
            const fs = require('fs');
            const path = require('path');
            const dataPath = path.join(__dirname, '../data/certs.json');
            const stats = fs.statSync(dataPath);

            healthData.checks.dataFile = {
                status: 'ok',
                size: stats.size,
                lastModified: stats.mtime.toISOString()
            };
        } catch (error) {
            console.error('Data file check failed:', error);
            healthData.checks.dataFile = {
                status: 'error',
                error: error.message
            };
            healthData.status = 'degraded';
        }

        // Determine overall status
        const hasErrors = Object.values(healthData.checks).some(check =>
            typeof check === 'object' && check.status === 'error'
        );

        if (hasErrors && healthData.status === 'healthy') {
            healthData.status = 'degraded';
        }

        const statusCode = healthData.status === 'healthy' ? 200 : 503;

        return {
            statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                ...corsHeaders,
                ...securityHeaders
            },
            body: JSON.stringify(healthData, null, 2)
        };

    } catch (error) {
        console.error('Health check error:', error);

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
                ...securityHeaders
            },
            body: JSON.stringify({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            })
        };
    }
};
