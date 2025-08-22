#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🔗 Checking all external links...');

// Configuration
const TIMEOUT = 15000; // 15 seconds
const MAX_CONCURRENT = 5;
const USER_AGENT = 'CERTopedia-LinkChecker/1.0 (https://cert.danieloo.com)';

// URLs to skip (examples, localhost, templates, etc.)
const SKIP_URLS = [
  'http://localhost:8000',
  'https://localhost:8000',
  'https://official-website.domain',
  'https://github.com/Ola-Daniel/CERTopedia.git',
  'https://github.com/your-username/CERTopedia.git',
  'https://github.com/Ola-Daniel/CERTopedia/discussions',
  'contact@cert.domain',
  'mailto:contact@cert.domain',
  '+XX XXX XXX XXXX',
  'tel:+XX XXX XXX XXXX'
];

// Link validation results
const results = {
  total: 0,
  valid: 0,
  invalid: 0,
  timeout: 0,
  errors: []
};

function makeRequest(url, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const module = url.startsWith('https:') ? https : http;
    
    const options = {
      timeout: timeout,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'close'
      }
    };
    
    const req = module.get(url, options, (res) => {
      // Follow redirects manually to get final status
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        console.log(`  🔄 Redirect: ${url} → ${redirectUrl}`);
        
        // Prevent infinite redirects
        if (redirectUrl === url) {
          reject(new Error('Infinite redirect loop'));
          return;
        }
        
        makeRequest(redirectUrl, timeout).then(resolve).catch(reject);
        return;
      }
      
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        url: url,
        finalUrl: url
      });
      
      // Drain response to free up connection
      res.resume();
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(timeout);
  });
}

async function checkLink(url, context = '') {
  const startTime = Date.now();
  
  try {
    // Skip URLs in the skip list (examples, localhost, templates)
    if (SKIP_URLS.includes(url) || SKIP_URLS.some(skipUrl => url.includes(skipUrl))) {
      console.log(`⏭️  ${context}: ${url} (skipped - example/template URL)`);
      return { valid: true, url, context, type: 'skipped', skipped: true };
    }
    
    // Skip mailto and tel links
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      console.log(`✅ ${context}: ${url} (skipped - protocol link)`);
      return { valid: true, url, context, type: 'protocol' };
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      throw new Error('Invalid URL format');
    }
    
    process.stdout.write(`🔍 Checking: ${context}: ${url}\n`);
    
    const response = await makeRequest(url);
    const responseTime = Date.now() - startTime;
    
    const isValid = response.statusCode >= 200 && response.statusCode < 400;
    const isWarning = response.statusCode === 403 || response.statusCode === 429; // Forbidden or rate limited
    
    if (isValid) {
      console.log(`✅ ${context}: ${url} (${response.statusCode}) [${responseTime}ms]`);
      return { 
        valid: true, 
        url, 
        context, 
        statusCode: response.statusCode, 
        responseTime 
      };
    } else if (isWarning) {
      console.log(`⚠️  ${context}: ${url} (${response.statusCode}) [${responseTime}ms] - Warning only`);
      return { 
        valid: true, // Don't fail CI for warnings
        url, 
        context, 
        statusCode: response.statusCode, 
        responseTime,
        warning: true,
        error: `HTTP ${response.statusCode} (Warning)`
      };
    } else {
      console.log(`❌ ${context}: ${url} (${response.statusCode}) [${responseTime}ms]`);
      return { 
        valid: false, 
        url, 
        context, 
        statusCode: response.statusCode, 
        responseTime,
        error: `HTTP ${response.statusCode}`
      };
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const isTimeout = error.message.includes('timeout');
    
    if (isTimeout) {
      console.log(`⏰ ${context}: ${url} (timeout) [${responseTime}ms]`);
      return { 
        valid: false, 
        url, 
        context, 
        error: 'Timeout', 
        timeout: true,
        responseTime 
      };
    } else {
      console.log(`❌ ${context}: ${url} (${error.message}) [${responseTime}ms]`);
      return { 
        valid: false, 
        url, 
        context, 
        error: error.message,
        responseTime 
      };
    }
  }
}

async function checkLinksInBatches(links, batchSize = MAX_CONCURRENT) {
  const results = [];
  
  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(links.length/batchSize)} (${batch.length} links)`);
    
    const batchPromises = batch.map(link => checkLink(link.url, link.context));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to servers
    if (i + batchSize < links.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

function extractLinksFromCertData() {
  const dataPath = path.join(__dirname, '../data/certs.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ certs.json file not found');
    return [];
  }
  
  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const certs = JSON.parse(rawData);
    
    const links = [];
    
    certs.forEach((cert, index) => {
      const certContext = `CERT ${index + 1} (${cert.country} - ${cert.name})`;
      
      if (cert.website) {
        links.push({
          url: cert.website,
          context: `${certContext} - Website`,
          type: 'website'
        });
      }
      
      if (cert.email && cert.email.includes('@')) {
        links.push({
          url: `mailto:${cert.email}`,
          context: `${certContext} - Email`,
          type: 'email'
        });
      }
    });
    
    return links;
    
  } catch (error) {
    console.error('❌ Error reading CERT data:', error.message);
    return [];
  }
}

function extractLinksFromMarkdown() {
  const markdownFiles = [
    { path: '../README.md', name: 'README' },
    { path: '../DEPLOYMENT.md', name: 'DEPLOYMENT' },
    { path: '../CONTRIBUTING.md', name: 'CONTRIBUTING' },
    { path: '../AUTHENTICATION.md', name: 'AUTHENTICATION' }
  ];
  
  const links = [];
  
  markdownFiles.forEach(file => {
    const filePath = path.join(__dirname, file.path);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file.name}.md not found, skipping`);
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract markdown links [text](url)
      const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = markdownLinkRegex.exec(content)) !== null) {
        const url = match[2];
        
        // Skip relative links, anchors, and URLs in skip list
        if ((url.startsWith('http://') || url.startsWith('https://')) && 
            !SKIP_URLS.includes(url) && 
            !SKIP_URLS.some(skipUrl => url.includes(skipUrl))) {
          links.push({
            url: url,
            context: `${file.name}.md - "${match[1]}"`,
            type: 'markdown'
          });
        }
      }
      
      // Extract plain URLs
      const urlRegex = /https?:\/\/[^\s<>"\]]+/g;
      const urlMatches = content.match(urlRegex) || [];
      
      urlMatches.forEach(url => {
        // Clean up URL (remove trailing punctuation that might be captured)
        const cleanUrl = url.replace(/[)}\].,;:!?]+$/, '');
        
        // Avoid duplicates from markdown links and skip URLs in skip list
        if (!links.some(link => link.url === cleanUrl) && 
            !SKIP_URLS.includes(cleanUrl) && 
            !SKIP_URLS.some(skipUrl => cleanUrl.includes(skipUrl))) {
          links.push({
            url: cleanUrl,
            context: `${file.name}.md - Plain URL`,
            type: 'plain'
          });
        }
      });
      
    } catch (error) {
      console.error(`❌ Error reading ${file.name}.md:`, error.message);
    }
  });
  
  return links;
}

function extractLinksFromHtml() {
  const htmlPath = path.join(__dirname, '../index.html');
  
  if (!fs.existsSync(htmlPath)) {
    console.log('⚠️  index.html not found, skipping');
    return [];
  }
  
  const links = [];
  
  try {
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Extract href attributes
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    
    while ((match = hrefRegex.exec(content)) !== null) {
      const url = match[1];
      
      if ((url.startsWith('http://') || url.startsWith('https://')) && 
          !SKIP_URLS.includes(url) && 
          !SKIP_URLS.some(skipUrl => url.includes(skipUrl))) {
        links.push({
          url: url,
          context: 'index.html - Link',
          type: 'html'
        });
      }
    }
    
    // Extract src attributes (for external resources)
    const srcRegex = /src=["']([^"']+)["']/g;
    while ((match = srcRegex.exec(content)) !== null) {
      const url = match[1];
      
      if ((url.startsWith('http://') || url.startsWith('https://')) && 
          !SKIP_URLS.includes(url) && 
          !SKIP_URLS.some(skipUrl => url.includes(skipUrl))) {
        links.push({
          url: url,
          context: 'index.html - Resource',
          type: 'resource'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error reading index.html:', error.message);
  }
  
  return links;
}

function generateReport(linkResults) {
  console.log('\n📊 Link Check Report');
  console.log('═'.repeat(50));
  
  const summary = linkResults.reduce((acc, result) => {
    acc.total++;
    if (result.valid) {
      acc.valid++;
      if (result.warning) {
        acc.warnings++;
      }
    } else {
      acc.invalid++;
      if (result.timeout) {
        acc.timeout++;
      }
    }
    return acc;
  }, { total: 0, valid: 0, invalid: 0, timeout: 0, warnings: 0 });
  
  console.log(`📈 Total Links Checked: ${summary.total}`);
  console.log(`✅ Valid Links: ${summary.valid}`);
  console.log(`❌ Invalid Links: ${summary.invalid}`);
  console.log(`⏰ Timeouts: ${summary.timeout}`);
  console.log(`⚠️  Warnings: ${summary.warnings}`);
  console.log(`📊 Success Rate: ${((summary.valid / summary.total) * 100).toFixed(1)}%`);
  
  // Group by type
  const byType = linkResults.reduce((acc, result) => {
    const type = result.type || 'unknown';
    if (!acc[type]) {
      acc[type] = { total: 0, valid: 0 };
    }
    acc[type].total++;
    if (result.valid) {
      acc[type].valid++;
    }
    return acc;
  }, {});
  
  console.log('\n📋 Results by Type:');
  Object.entries(byType).forEach(([type, stats]) => {
    const rate = ((stats.valid / stats.total) * 100).toFixed(1);
    console.log(`  ${type}: ${stats.valid}/${stats.total} (${rate}%)`);
  });
  
  // Show failed links
  const failedLinks = linkResults.filter(result => !result.valid);
  if (failedLinks.length > 0) {
    console.log('\n❌ Failed Links:');
    failedLinks.forEach(result => {
      console.log(`  • ${result.context}`);
      console.log(`    URL: ${result.url}`);
      console.log(`    Error: ${result.error || result.statusCode}`);
      console.log('');
    });
  }
  
  // Performance stats
  const avgResponseTime = linkResults
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / 
    linkResults.filter(r => r.responseTime).length;
  
  if (avgResponseTime) {
    console.log(`⚡ Average Response Time: ${Math.round(avgResponseTime)}ms`);
  }
  
  return summary;
}

async function main() {
  try {
    console.log('🚀 Starting comprehensive link check...\n');
    
    // Collect all links
    console.log('📊 Collecting links from all sources...');
    const certLinks = extractLinksFromCertData();
    const markdownLinks = extractLinksFromMarkdown();
    const htmlLinks = extractLinksFromHtml();
    
    const allLinks = [
      ...certLinks,
      ...markdownLinks,
      ...htmlLinks
    ];
    
    // Remove duplicates
    const uniqueLinks = allLinks.filter((link, index, arr) => 
      arr.findIndex(l => l.url === link.url) === index
    );
    
    console.log(`📋 Found ${allLinks.length} total links (${uniqueLinks.length} unique)`);
    console.log(`   • CERT data: ${certLinks.length}`);
    console.log(`   • Markdown files: ${markdownLinks.length}`);
    console.log(`   • HTML files: ${htmlLinks.length}`);
    
    if (uniqueLinks.length === 0) {
      console.log('⚠️  No links found to check');
      process.exit(0);
    }
    
    // Check all links
    console.log('\n🔍 Starting link validation...');
    const linkResults = await checkLinksInBatches(uniqueLinks);
    
    // Generate report
    const summary = generateReport(linkResults);
    
    // Exit with appropriate code
    if (summary.invalid === 0) {
      console.log('\n🎉 All links are valid!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${summary.invalid} invalid link(s) found`);
      
      // Don't fail CI for timeouts only (external services may be temporarily down)
      const nonTimeoutErrors = summary.invalid - summary.timeout;
      if (nonTimeoutErrors === 0 && summary.timeout > 0) {
        console.log('ℹ️  Only timeout errors found, treating as warnings');
        process.exit(0);
      } else {
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('💥 Link checker failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Link check interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Link check terminated');
  process.exit(143);
});

main();