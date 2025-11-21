// Debug phone regex patterns
const phoneTests = [
    '+1234567890',
    '(123) 456-7890', 
    '123-456-7890',
    '123.456.7890',
    '1234567890',
    '+44 20 7946 0958'
];

const phonePatterns = [
    /^\+?[\d\s\-\(\)\.]{10,18}$/, // General international format
    /^\(\d{3}\)\s?\d{3}-?\d{4}$/, // US format with parentheses
    /^\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}$/, // US format with separators
    /^\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}$/, // International with country code
    /^\d{10,15}$/ // Plain digits
];

console.log('🔍 Phone Regex Debug');
console.log('='.repeat(50));

phoneTests.forEach(phone => {
    console.log(`\nTesting: "${phone}"`);
    
    const digitsOnly = phone.replace(/\D/g, "");
    console.log(`  Digits only: "${digitsOnly}" (length: ${digitsOnly.length})`);
    
    phonePatterns.forEach((pattern, index) => {
        const matches = pattern.test(phone);
        console.log(`  Pattern ${index + 1}: ${matches ? '✅' : '❌'} ${pattern}`);
    });
    
    const isValidFormat = phonePatterns.some(pattern => pattern.test(phone));
    console.log(`  Overall: ${isValidFormat ? '✅ VALID' : '❌ INVALID'}`);
});

console.log('\n' + '='.repeat(50));
console.log('Recommendation: Fix patterns that are failing');
