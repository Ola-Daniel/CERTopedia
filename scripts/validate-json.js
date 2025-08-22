#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating JSON data...');

// Required fields for each CERT entry
const requiredFields = [
  'country',
  'name', 
  'fullName',
  'website',
  'emergencyContact',
  'email',
  'established',
  'description',
  'sector',
  'pgpKey',
  'verified',
  'lastUpdated'
];

const validSectors = ['Government', 'National', 'Academic', 'Commercial'];

function validateCertEntry(cert, index) {
  const errors = [];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (!cert.hasOwnProperty(field) || cert[field] === null || cert[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate specific fields
  if (cert.country && typeof cert.country !== 'string') {
    errors.push('Country must be a string');
  }
  
  if (cert.name && typeof cert.name !== 'string') {
    errors.push('Name must be a string');
  }
  
  if (cert.website && !cert.website.startsWith('http')) {
    errors.push('Website must be a valid URL starting with http/https');
  }
  
  if (cert.email && !cert.email.includes('@')) {
    errors.push('Email must be a valid email address');
  }
  
  if (cert.sector && !validSectors.includes(cert.sector)) {
    errors.push(`Sector must be one of: ${validSectors.join(', ')}`);
  }
  
  if (cert.verified !== true) {
    errors.push('Verified field must be true');
  }
  
  // Validate PGP key structure
  if (cert.pgpKey) {
    if (typeof cert.pgpKey.available !== 'boolean') {
      errors.push('pgpKey.available must be a boolean');
    }
    
    if (cert.pgpKey.available === true) {
      if (!cert.pgpKey.keyId || typeof cert.pgpKey.keyId !== 'string') {
        errors.push('pgpKey.keyId must be a string when available is true');
      }
    } else {
      if (cert.pgpKey.keyId !== null) {
        errors.push('pgpKey.keyId should be null when available is false');
      }
      if (cert.pgpKey.fingerprint !== null) {
        errors.push('pgpKey.fingerprint should be null when available is false');
      }
    }
  }
  
  // Validate date format
  if (cert.lastUpdated) {
    const date = new Date(cert.lastUpdated);
    if (isNaN(date.getTime())) {
      errors.push('lastUpdated must be a valid ISO date string');
    }
  }
  
  return errors;
}

function validateAlphabeticalOrder(certs) {
  const countries = certs.map(cert => cert.country);
  const sortedCountries = [...countries].sort();
  
  for (let i = 0; i < countries.length; i++) {
    if (countries[i] !== sortedCountries[i]) {
      return {
        valid: false,
        error: `Entries are not in alphabetical order by country. Expected "${sortedCountries[i]}" but found "${countries[i]}" at position ${i}`
      };
    }
  }
  
  return { valid: true };
}

function validateUniqueEntries(certs) {
  const seen = new Set();
  const duplicates = [];
  
  certs.forEach((cert, index) => {
    const key = `${cert.country}-${cert.name}`;
    if (seen.has(key)) {
      duplicates.push(`Duplicate entry found at index ${index}: ${key}`);
    } else {
      seen.add(key);
    }
  });
  
  return duplicates;
}

try {
  const dataPath = path.join(__dirname, '../data/certs.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: certs.json file not found');
    process.exit(1);
  }
  
  const rawData = fs.readFileSync(dataPath, 'utf8');
  let certs;
  
  try {
    certs = JSON.parse(rawData);
  } catch (parseError) {
    console.error('❌ Error: Invalid JSON format');
    console.error(parseError.message);
    process.exit(1);
  }
  
  if (!Array.isArray(certs)) {
    console.error('❌ Error: JSON data must be an array');
    process.exit(1);
  }
  
  console.log(`📊 Validating ${certs.length} CERT entries...`);
  
  let totalErrors = 0;
  
  // Validate individual entries
  certs.forEach((cert, index) => {
    const errors = validateCertEntry(cert, index);
    if (errors.length > 0) {
      console.error(`❌ Entry ${index + 1} (${cert.country || 'Unknown'} - ${cert.name || 'Unknown'}):`);
      errors.forEach(error => console.error(`   • ${error}`));
      totalErrors += errors.length;
    }
  });
  
  // Validate alphabetical order
  const orderCheck = validateAlphabeticalOrder(certs);
  if (!orderCheck.valid) {
    console.error(`❌ Order Error: ${orderCheck.error}`);
    totalErrors++;
  }
  
  // Validate unique entries
  const duplicates = validateUniqueEntries(certs);
  if (duplicates.length > 0) {
    console.error('❌ Duplicate Entries:');
    duplicates.forEach(duplicate => console.error(`   • ${duplicate}`));
    totalErrors += duplicates.length;
  }
  
  // Summary
  if (totalErrors === 0) {
    console.log('✅ All JSON data is valid!');
    console.log(`📈 Summary: ${certs.length} CERTs from ${new Set(certs.map(c => c.country)).size} countries`);
    
    // Additional stats
    const pgpEnabled = certs.filter(c => c.pgpKey && c.pgpKey.available).length;
    const sectors = certs.reduce((acc, cert) => {
      acc[cert.sector] = (acc[cert.sector] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`🔐 PGP-enabled CERTs: ${pgpEnabled}/${certs.length}`);
    console.log('🏷️  Sectors:', Object.entries(sectors).map(([sector, count]) => `${sector}: ${count}`).join(', '));
    
  } else {
    console.error(`❌ Validation failed with ${totalErrors} error(s)`);
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Unexpected error during validation:', error.message);
  process.exit(1);
}