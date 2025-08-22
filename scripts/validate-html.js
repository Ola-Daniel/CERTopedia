#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📄 Validating HTML files...');

function validateHtmlFile(filePath, fileName) {
    console.log(`🔍 Validating: ${fileName}`);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${fileName}`);
        return false;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic HTML validation checks
        const checks = {
            hasDoctype: content.trim().toLowerCase().startsWith('<!doctype html>'),
            hasTitle: content.includes('<title>') && content.includes('</title>'),
            hasMetaCharset: content.includes('<meta charset="UTF-8">') || content.includes('charset=utf-8'),
            hasMetaViewport: content.includes('name="viewport"'),
            hasClosingHtml: content.includes('</html>'),
            hasClosingBody: content.includes('</body>'),
            hasClosingHead: content.includes('</head>'),
            
            // CERTopedia specific checks
            hasCertopediaTitle: content.includes('CERTopedia'),
            hasMainScript: content.includes('main.js') || content.includes('main.min.js'),
            hasStylesheet: content.includes('styles.css') || content.includes('styles.min.css'),
            hasFavicon: content.includes('favicon.svg'),
            hasMetaDescription: content.includes('meta name="description"')
        };
        
        // Count passed checks
        const passedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;
        
        console.log(`📊 HTML validation: ${passedChecks}/${totalChecks} checks passed`);
        
        // Report failed checks
        const failedChecks = Object.entries(checks)
            .filter(([_, passed]) => !passed)
            .map(([check, _]) => check);
            
        if (failedChecks.length > 0) {
            console.log('⚠️  Failed checks:');
            failedChecks.forEach(check => {
                console.log(`   • ${check}`);
            });
        }
        
        // Only fail for critical issues
        const criticalChecks = ['hasDoctype', 'hasTitle', 'hasClosingHtml', 'hasClosingBody'];
        const criticalFailures = failedChecks.filter(check => criticalChecks.includes(check));
        
        if (criticalFailures.length > 0) {
            console.error(`❌ Critical HTML validation issues found`);
            return false;
        }
        
        console.log(`✅ ${fileName} is valid HTML`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error reading ${fileName}:`, error.message);
        return false;
    }
}

function buildIfNeeded() {
    const distPath = path.join(__dirname, '../dist');
    const indexPath = path.join(distPath, 'index.html');
    
    // Check if build exists and is recent
    if (fs.existsSync(indexPath)) {
        const srcIndexPath = path.join(__dirname, '../index.html');
        const distStat = fs.statSync(indexPath);
        const srcStat = fs.statSync(srcIndexPath);
        
        // If dist is newer than src, no need to rebuild
        if (distStat.mtime >= srcStat.mtime) {
            console.log('📦 Build is up to date');
            return true;
        }
    }
    
    console.log('📦 Building project for HTML validation...');
    try {
        execSync('npm run build', { 
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: path.join(__dirname, '..')
        });
        console.log('✅ Build completed');
        return true;
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        return false;
    }
}

function main() {
    console.log('🚀 Starting HTML validation...\n');
    
    // Build the project if needed
    if (!buildIfNeeded()) {
        console.error('❌ Cannot validate HTML without successful build');
        process.exit(1);
    }
    
    const filesToValidate = [
        {
            path: path.join(__dirname, '../index.html'),
            name: 'Source index.html'
        },
        {
            path: path.join(__dirname, '../dist/index.html'),
            name: 'Built index.html'
        }
    ];
    
    let allValid = true;
    
    filesToValidate.forEach(file => {
        if (fs.existsSync(file.path)) {
            const isValid = validateHtmlFile(file.path, file.name);
            allValid = allValid && isValid;
        } else {
            console.log(`⚠️  ${file.name} not found, skipping`);
        }
    });
    
    console.log('\n📊 HTML Validation Summary:');
    if (allValid) {
        console.log('✅ All HTML files are valid!');
        process.exit(0);
    } else {
        console.log('❌ HTML validation failed');
        process.exit(1);
    }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
    console.log('\n⚠️  HTML validation interrupted');
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  HTML validation terminated');
    process.exit(143);
});

main();