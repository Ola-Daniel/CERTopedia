#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔒 Running security checks...');

// Security check results
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
};

// Security patterns to check for
const SECURITY_PATTERNS = {
    // Sensitive information patterns
    secrets: [
        /(?:password|pwd|pass)\s*[:=]\s*['"]\w+['"]/i,
        /(?:api[_-]?key|apikey)\s*[:=]\s*['"]\w+['"]/i,
        /(?:secret[_-]?key|secretkey)\s*[:=]\s*['"]\w+['"]/i,
        /(?:access[_-]?token|accesstoken)\s*[:=]\s*['"]\w+['"]/i,
        /(?:bearer\s+)?[a-zA-Z0-9_\-]{20,}/,
        /pk_[a-zA-Z0-9]{24}/,  // Stripe keys
        /sk_[a-zA-Z0-9]{24}/,  // Stripe secret keys
        /aws_access_key_id\s*[:=]\s*['"]\w+['"]/i,
        /aws_secret_access_key\s*[:=]\s*['"]\w+['"]/i
    ],
    
    // Dangerous JavaScript patterns
    dangerous: [
        /eval\s*\(/,
        /document\.write\s*\(/,
        /innerHTML\s*=\s*.*\+/,
        /outerHTML\s*=\s*.*\+/,
        /\.exec\s*\(/,
        /new\s+Function\s*\(/,
        /setTimeout\s*\(\s*['"]/,
        /setInterval\s*\(\s*['"]/
    ],
    
    // XSS vulnerabilities
    xss: [
        /document\.location\.href\s*=\s*.*\+/,
        /window\.location\s*=\s*.*\+/,
        /location\.assign\s*\(.*\+/,
        /location\.replace\s*\(.*\+/
    ],
    
    // Insecure protocols
    insecure: [
        /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/,
        /ftp:\/\//,
        /telnet:\/\//
    ]
};

// File extensions to check
const CHECK_EXTENSIONS = ['.js', '.html', '.css', '.json', '.md', '.yml', '.yaml'];

function checkFileContent(filePath, content) {
    const issues = [];
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Skip checking certain files
    if (fileName === 'package-lock.json' || fileName === 'yarn.lock') {
        return issues;
    }
    
    // Check for secrets
    SECURITY_PATTERNS.secrets.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
            issues.push({
                type: 'secret',
                severity: 'high',
                file: filePath,
                pattern: `Secret pattern ${index + 1}`,
                match: matches[0].substring(0, 50) + '...',
                description: 'Potential secret or credential found'
            });
        }
    });
    
    // Check JavaScript files for dangerous patterns
    if (ext === '.js' || ext === '.html') {
        SECURITY_PATTERNS.dangerous.forEach((pattern, index) => {
            const matches = content.match(pattern);
            if (matches) {
                issues.push({
                    type: 'dangerous',
                    severity: 'medium',
                    file: filePath,
                    pattern: `Dangerous JS pattern ${index + 1}`,
                    match: matches[0].substring(0, 50) + '...',
                    description: 'Potentially dangerous JavaScript pattern'
                });
            }
        });
        
        // Check for XSS patterns
        SECURITY_PATTERNS.xss.forEach((pattern, index) => {
            const matches = content.match(pattern);
            if (matches) {
                issues.push({
                    type: 'xss',
                    severity: 'high',
                    file: filePath,
                    pattern: `XSS pattern ${index + 1}`,
                    match: matches[0].substring(0, 50) + '...',
                    description: 'Potential XSS vulnerability'
                });
            }
        });
    }
    
    // Check for insecure protocols
    SECURITY_PATTERNS.insecure.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
            issues.push({
                type: 'insecure',
                severity: 'medium',
                file: filePath,
                pattern: `Insecure protocol ${index + 1}`,
                match: matches[0].substring(0, 50) + '...',
                description: 'Insecure protocol usage (HTTP instead of HTTPS)'
            });
        }
    });
    
    return issues;
}

function checkFilePermissions(filePath) {
    const issues = [];
    
    try {
        const stats = fs.statSync(filePath);
        const mode = stats.mode;
        
        // Check for overly permissive files (world writable)
        if (mode & parseInt('002', 8)) {
            issues.push({
                type: 'permissions',
                severity: 'medium',
                file: filePath,
                description: 'File is world-writable',
                mode: mode.toString(8)
            });
        }
        
        // Check for executable scripts that might be dangerous
        const ext = path.extname(filePath).toLowerCase();
        if (['.sh', '.bat', '.cmd', '.exe'].includes(ext) && (mode & parseInt('111', 8))) {
            issues.push({
                type: 'executable',
                severity: 'low',
                file: filePath,
                description: 'Executable script file',
                mode: mode.toString(8)
            });
        }
        
    } catch (error) {
        // Ignore permission errors
    }
    
    return issues;
}

function checkDependencies() {
    const issues = [];
    const packageJsonPath = path.join(__dirname, '../package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        return issues;
    }
    
    try {
        const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        // Check for known vulnerable packages (basic check)
        const allDeps = {
            ...packageJson.dependencies || {},
            ...packageJson.devDependencies || {}
        };
        
        // List of packages with known security issues
        const vulnerablePackages = [
            'event-stream',
            'eslint-scope',
            'getcookies',
            'http-proxy-middleware'
        ];
        
        vulnerablePackages.forEach(pkg => {
            if (allDeps[pkg]) {
                issues.push({
                    type: 'dependency',
                    severity: 'high',
                    file: packageJsonPath,
                    description: `Potentially vulnerable dependency: ${pkg}`,
                    package: pkg,
                    version: allDeps[pkg]
                });
            }
        });
        
        // Check for outdated versions (very basic check)
        Object.entries(allDeps).forEach(([pkg, version]) => {
            if (version.includes('*') || version.includes('x')) {
                issues.push({
                    type: 'dependency',
                    severity: 'low',
                    file: packageJsonPath,
                    description: `Wildcard version for ${pkg} may introduce security risks`,
                    package: pkg,
                    version: version
                });
            }
        });
        
    } catch (error) {
        issues.push({
            type: 'dependency',
            severity: 'low',
            file: packageJsonPath,
            description: 'Could not parse package.json for security analysis'
        });
    }
    
    return issues;
}

function scanDirectory(dirPath, baseDir = '') {
    const issues = [];
    
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.join(baseDir, entry.name);
            
            // Skip common directories that don't need security scanning
            if (entry.isDirectory()) {
                if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
                    continue;
                }
                
                issues.push(...scanDirectory(fullPath, relativePath));
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                
                // Check file permissions
                issues.push(...checkFilePermissions(fullPath));
                
                // Check file content for security issues
                if (CHECK_EXTENSIONS.includes(ext)) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        issues.push(...checkFileContent(relativePath, content));
                    } catch (error) {
                        // Skip binary files or files we can't read
                    }
                }
            }
        }
    } catch (error) {
        // Skip directories we can't read
    }
    
    return issues;
}

function checkConfigurationFiles() {
    const issues = [];
    const configFiles = [
        '../.env',
        '../.env.local',
        '../.env.production',
        '../config.json',
        '../config.js'
    ];
    
    configFiles.forEach(configFile => {
        const filePath = path.join(__dirname, configFile);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Check for exposed secrets in config files
                if (content.includes('password') || content.includes('secret') || content.includes('key')) {
                    issues.push({
                        type: 'config',
                        severity: 'high',
                        file: path.basename(filePath),
                        description: 'Configuration file may contain sensitive information'
                    });
                }
            } catch (error) {
                // Skip files we can't read
            }
        }
    });
    
    return issues;
}

function generateSecurityReport(allIssues) {
    console.log('\n🔒 Security Check Report');
    console.log('═'.repeat(50));
    
    const summary = allIssues.reduce((acc, issue) => {
        acc.total++;
        if (issue.severity === 'high') {
            acc.high++;
        } else if (issue.severity === 'medium') {
            acc.medium++;
        } else {
            acc.low++;
        }
        return acc;
    }, { total: 0, high: 0, medium: 0, low: 0 });
    
    console.log(`📊 Total Issues Found: ${summary.total}`);
    console.log(`🔴 High Severity: ${summary.high}`);
    console.log(`🟡 Medium Severity: ${summary.medium}`);
    console.log(`🟢 Low Severity: ${summary.low}`);
    
    if (summary.total === 0) {
        console.log('\n✅ No security issues found!');
        return summary;
    }
    
    // Group issues by type
    const byType = allIssues.reduce((acc, issue) => {
        if (!acc[issue.type]) {
            acc[issue.type] = [];
        }
        acc[issue.type].push(issue);
        return acc;
    }, {});
    
    // Display issues by severity
    ['high', 'medium', 'low'].forEach(severity => {
        const severityIssues = allIssues.filter(issue => issue.severity === severity);
        if (severityIssues.length > 0) {
            const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
            console.log(`\n${icon} ${severity.toUpperCase()} SEVERITY ISSUES:`);
            
            severityIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue.description}`);
                console.log(`     File: ${issue.file}`);
                if (issue.match) {
                    console.log(`     Pattern: ${issue.match}`);
                }
                console.log('');
            });
        }
    });
    
    return summary;
}

function main() {
    console.log('🚀 Starting comprehensive security scan...\n');
    
    const projectRoot = path.join(__dirname, '..');
    let allIssues = [];
    
    console.log('🔍 Scanning project files...');
    allIssues.push(...scanDirectory(projectRoot));
    
    console.log('📦 Checking dependencies...');
    allIssues.push(...checkDependencies());
    
    console.log('⚙️  Checking configuration files...');
    allIssues.push(...checkConfigurationFiles());
    
    console.log(`\n📋 Scanned project for security issues`);
    
    // Generate report
    const summary = generateSecurityReport(allIssues);
    
    // Determine exit code
    if (summary.high > 0) {
        console.log('\n❌ Security check failed due to high-severity issues');
        process.exit(1);
    } else if (summary.medium > 0) {
        console.log('\n⚠️  Security check completed with warnings');
        console.log('ℹ️  Consider addressing medium-severity issues');
        process.exit(0);
    } else if (summary.low > 0) {
        console.log('\n✅ Security check passed with minor recommendations');
        process.exit(0);
    } else {
        console.log('\n🎉 Security check passed! No issues found.');
        process.exit(0);
    }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
    console.log('\n⚠️  Security check interrupted');
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Security check terminated');
    process.exit(143);
});

main();