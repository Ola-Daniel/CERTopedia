const fs = require('fs');
const path = require('path');

// Cache static files in memory
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Security headers
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';"
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function getCachedFile(filePath) {
  const now = Date.now();
  const cached = cache.get(filePath);
  
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const content = fs.readFileSync(fullPath);
    
    cache.set(filePath, {
      content,
      timestamp: now
    });
    
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

function handleStaticFile(requestedPath) {
  let filePath = requestedPath === '/' ? '/index.html' : requestedPath;
  
  // Remove leading slash and resolve to dist directory
  filePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  filePath = path.join('dist', filePath);
  
  const content = getCachedFile(filePath);
  
  if (!content) {
    // Try index.html for SPA routing
    const indexContent = getCachedFile('dist/index.html');
    if (indexContent) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
          ...securityHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: indexContent.toString()
      };
    }
    
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/html',
        ...securityHeaders
      },
      body: '<h1>404 - Not Found</h1><p>The requested resource was not found.</p>'
    };
  }
  
  const contentType = getContentType(filePath);
  const isText = contentType.startsWith('text/') || 
                contentType.includes('javascript') || 
                contentType.includes('json');
  
  // Set appropriate cache headers
  let cacheControl = 'public, max-age=31536000, immutable'; // 1 year for assets
  if (contentType === 'text/html') {
    cacheControl = 'no-cache, no-store, must-revalidate';
  } else if (contentType === 'application/json') {
    cacheControl = 'public, max-age=3600'; // 1 hour for JSON data
  }
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      ...securityHeaders
    },
    body: isText ? content.toString() : content.toString('base64'),
    isBase64Encoded: !isText
  };
}

exports.handler = async (event) => {
  console.log('Request:', JSON.stringify(event, null, 2));
  
  try {
    const { requestContext, rawPath, rawQueryString } = event;
    const method = requestContext.http.method;
    const path = rawPath || '/';
    
    // Add CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://cert.danieloo.com',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '86400'
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
    
    // Handle GET requests for static files
    if (method === 'GET') {
      const response = handleStaticFile(path);
      response.headers = {
        ...response.headers,
        ...corsHeaders
      };
      return response;
    }
    
    // Handle other HTTP methods
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
    
  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...securityHeaders
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      })
    };
  }
};