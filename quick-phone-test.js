const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function quickPhoneTest() {
    console.log('📱 Quick Phone Validation Test');
    console.log('=' .repeat(50));
    
    const phoneTests = [
        { phone: '+1234567890', shouldPass: true, description: 'International format with +' },
        { phone: '(123) 456-7890', shouldPass: true, description: 'US format with parentheses' },
        { phone: '123-456-7890', shouldPass: true, description: 'US format with dashes' },
        { phone: '123.456.7890', shouldPass: true, description: 'US format with dots' },
        { phone: '1234567890', shouldPass: true, description: 'Plain 10 digits' },
        { phone: '+44 20 7946 0958', shouldPass: true, description: 'UK format with spaces' },
        { phone: '123', shouldPass: false, description: 'Too short' },
        { phone: 'not-a-phone', shouldPass: false, description: 'Invalid format' }
    ];

    let passCount = 0;
    let totalCount = phoneTests.length;

    for (const test of phoneTests) {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Phone',
                lastName: 'Test',
                email: `phonetest${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
                password: 'PhoneTestPassword123!',
                phone: test.phone
            });
            
            const passed = test.shouldPass && response.status === 201;
            if (passed) passCount++;
            
            console.log(`${passed ? '✅' : '❌'} ${test.description}: ${passed ? 'CORRECT' : 'INCORRECT'} (${response.status})`);
            
        } catch (error) {
            const failed = !test.shouldPass && error.response?.status === 400;
            if (failed) passCount++;
            
            console.log(`${failed ? '✅' : '❌'} ${test.description}: ${failed ? 'CORRECT' : 'INCORRECT'} (${error.response?.status || 'ERR'})`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Phone Validation Results: ${passCount}/${totalCount} (${((passCount/totalCount)*100).toFixed(1)}%)`);
    
    if (passCount === totalCount) {
        console.log('🎉 Phone validation is working perfectly!');
    } else {
        console.log('⚠️ Phone validation needs more work');
    }
    
    return passCount === totalCount;
}

quickPhoneTest().catch(console.error);
