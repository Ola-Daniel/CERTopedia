#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Updating asset references for production...');

function updateHtmlReferences() {
  const htmlPath = path.join(__dirname, '../dist/index.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.log('⚠️  dist/index.html not found, skipping HTML optimization');
    return true; // Don't fail if dist doesn't exist yet
  }
  
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Update CSS reference to minified version
  html = html.replace(
    'href="assets/css/styles.css"',
    'href="assets/css/styles.min.css"'
  );
  
  // Update JS reference to minified version
  html = html.replace(
    'src="assets/js/main.js"',
    'src="assets/js/main.min.js"'
  );
  
  // Add cache busting for static assets
  const timestamp = Date.now();
  html = html.replace(
    /href="assets\/css\/styles\.min\.css"/g,
    `href="assets/css/styles.min.css?v=${timestamp}"`
  );
  html = html.replace(
    /src="assets\/js\/main\.min\.js"/g,
    `src="assets/js/main.min.js?v=${timestamp}"`
  );
  
  // Add preload hints for critical resources
  const preloadHints = `
    <link rel="preload" href="assets/css/styles.min.css?v=${timestamp}" as="style">
    <link rel="preload" href="assets/js/main.min.js?v=${timestamp}" as="script">
    <link rel="preload" href="data/certs.json" as="fetch" type="application/json" crossorigin>
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">`;
  
  html = html.replace('<link rel="stylesheet"', preloadHints + '\n    <link rel="stylesheet"');
  
  // Add performance optimizations
  const performanceScript = `
    <script>
      // Performance monitoring
      window.addEventListener('load', function() {
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing;
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          console.log('Page load time:', loadTime + 'ms');
          
          // Send to analytics if available
          if (typeof gtag !== 'undefined') {
            gtag('event', 'page_load_time', {
              'event_category': 'Performance',
              'event_label': 'Full Page Load',
              'value': loadTime
            });
          }
        }
      });
      
      // Service Worker registration
      if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
              console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
              console.log('SW registration failed: ', registrationError);
            });
        });
      }
    </script>`;
  
  html = html.replace('</head>', performanceScript + '\n</head>');
  
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Updated HTML references');
  return true;
}

function createServiceWorker() {
  // Ensure dist directory exists
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  const swPath = path.join(__dirname, '../dist/sw.js');
  const timestamp = Date.now();
  
  const serviceWorkerContent = `
const CACHE_NAME = 'certopedia-v${timestamp}';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/styles.min.css',
  '/assets/js/main.min.js',
  '/data/certs.json',
  '/assets/images/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app resources');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});`.trim();
  
  fs.writeFileSync(swPath, serviceWorkerContent);
  console.log('✅ Created service worker');
  return true;
}

function optimizeJson() {
  const jsonPath = path.join(__dirname, '../dist/data/certs.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.log('⚠️  dist/data/certs.json not found, skipping JSON optimization');
    return true; // Don't fail if dist doesn't exist yet
  }
  
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(rawData);
    
    // Minify JSON (remove unnecessary whitespace)
    const minifiedJson = JSON.stringify(data);
    fs.writeFileSync(jsonPath, minifiedJson);
    
    console.log('✅ Optimized JSON data');
    return true;
  } catch (error) {
    console.error('❌ Error optimizing JSON:', error.message);
    return false;
  }
}

function generateManifest() {
  // Ensure dist directory exists
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  const manifestPath = path.join(__dirname, '../dist/manifest.json');
  
  const manifest = {
    name: "CERTopedia - Global CERT Directory",
    short_name: "CERTopedia",
    description: "Comprehensive directory of Computer Emergency Response Teams worldwide",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    icons: [
      {
        src: "assets/images/favicon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ],
    categories: ["security", "utilities", "reference"],
    lang: "en-US"
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Generated web manifest');
  return true;
}

// Run all optimizations
async function main() {
  try {
    console.log('🚀 Starting production optimizations...\n');
    
    const tasks = [
      updateHtmlReferences,
      createServiceWorker,
      optimizeJson,
      generateManifest
    ];
    
    let completed = 0;
    
    for (const task of tasks) {
      if (task()) {
        completed++;
      }
    }
    
    console.log(`\n📊 Completed ${completed}/${tasks.length} optimization tasks`);
    
    if (completed === tasks.length) {
      console.log('✅ All optimizations completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  Some optimizations failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Optimization failed:', error.message);
    process.exit(1);
  }
}

main();