#!/usr/bin/env node

const https = require('https');
const http = require('http');

const DOMAIN = process.env.DOMAIN_NAME || 'cert.danieloo.com';
const BASE_URL = `https://${DOMAIN}`;

console.log(`🔥 Running smoke tests against ${BASE_URL}`);

function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const module = url.startsWith('https:') ? https : http;
    
    const req = module.get(url, {
      timeout: timeout,
      headers: {
        'User-Agent': 'CERTopedia-SmokeTest/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: url
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

async function testEndpoint(path, expectedStatus = 200, description = '') {
  const url = `${BASE_URL}${path}`;
  const testName = description || `GET ${path}`;
  
  try {
    console.log(`🧪 Testing: ${testName}`);
    
    const response = await makeRequest(url);
    
    if (response.statusCode === expectedStatus) {
      console.log(`✅ ${testName} - Status: ${response.statusCode}`);
      
      // Additional checks
      const checks = [];
      
      // Check security headers
      if (response.headers['x-content-type-options'] === 'nosniff') {
        checks.push('Security headers present');
      }
      
      // Check content type for HTML pages
      if (path === '/' || path.endsWith('.html')) {
        if (response.headers['content-type']?.includes('text/html')) {
          checks.push('Correct content type');
        }
        
        // Check for basic HTML structure
        if (response.body.includes('<title>') && response.body.includes('CERTopedia')) {
          checks.push('Valid HTML structure');
        }
      }
      
      // Check for JSON responses
      if (path.startsWith('/api/')) {
        if (response.headers['content-type']?.includes('application/json')) {
          try {
            const jsonData = JSON.parse(response.body);
            if (jsonData.success !== undefined) {
              checks.push('Valid JSON response');
            }
          } catch (e) {
            console.log(`⚠️  JSON parsing failed for ${path}`);
          }
        }
      }
      
      if (checks.length > 0) {
        console.log(`   📋 Additional checks: ${checks.join(', ')}`);
      }
      
      return true;
    } else {
      console.log(`❌ ${testName} - Expected: ${expectedStatus}, Got: ${response.statusCode}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
    return false;
  }
}

async function testPerformance(path, maxResponseTime = 2000) {
  const url = `${BASE_URL}${path}`;
  
  try {
    console.log(`⚡ Performance test: ${path}`);
    
    const startTime = Date.now();
    const response = await makeRequest(url);
    const responseTime = Date.now() - startTime;
    
    if (responseTime <= maxResponseTime) {
      console.log(`✅ Performance - ${path}: ${responseTime}ms (target: <${maxResponseTime}ms)`);
      return true;
    } else {
      console.log(`⚠️  Performance - ${path}: ${responseTime}ms (exceeds ${maxResponseTime}ms target)`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Performance test failed for ${path}: ${error.message}`);
    return false;
  }
}

async function runSmokeTests() {
  console.log(`🚀 Starting smoke tests for CERTopedia deployment\n`);
  
  const tests = [
    // Main application
    { path: '/', description: 'Homepage' },
    { path: '/index.html', description: 'Index page' },
    
    // Static assets
    { path: '/assets/css/styles.css', description: 'CSS file' },
    { path: '/assets/js/main.js', description: 'JavaScript file' },
    { path: '/assets/images/favicon.svg', description: 'Favicon' },
    
    // Data files
    { path: '/data/certs.json', description: 'CERT data' },
    
    // API endpoints
    { path: '/api/certs', description: 'API - Get all CERTs' },
    { path: '/api/stats', description: 'API - Get statistics' },
    { path: '/api/countries', description: 'API - Get countries' },
    { path: '/api/sectors', description: 'API - Get sectors' },
    { path: '/health', description: 'Health check endpoint' },
    
    // API with parameters
    { path: '/api/certs?search=germany', description: 'API - Search functionality' },
    { path: '/api/certs?sector=Government', description: 'API - Filter by sector' },
    
    // 404 handling
    { path: '/nonexistent-page', expectedStatus: 200, description: 'SPA routing (should return index.html)' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('📋 Running endpoint tests...\n');
  
  for (const test of tests) {
    const result = await testEndpoint(test.path, test.expectedStatus, test.description);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n⚡ Running performance tests...\n');
  
  const performanceTests = [
    '/',
    '/api/certs',
    '/api/stats'
  ];
  
  let performancePassed = 0;
  
  for (const path of performanceTests) {
    const result = await testPerformance(path);
    if (result) {
      performancePassed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Endpoint Tests: ${passed}/${passed + failed} passed`);
  console.log(`⚡ Performance Tests: ${performancePassed}/${performanceTests.length} passed`);
  
  const allTestsPassed = failed === 0;
  const performanceGood = performancePassed === performanceTests.length;
  
  if (allTestsPassed && performanceGood) {
    console.log('\n🎉 All smoke tests passed! Deployment is healthy.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the deployment.');
    process.exit(1);
  }
}

// Run the tests
runSmokeTests().catch(error => {
  console.error('💥 Smoke test runner failed:', error);
  process.exit(1);
});