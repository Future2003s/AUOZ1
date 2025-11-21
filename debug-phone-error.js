const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function debugPhoneError() {
    console.log('🔍 Debug Phone Validation Errors');
    console.log('=' .repeat(50));
    
    const testPhone = '(123) 456-7890';
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Debug',
            lastName: 'Phone',
            email: `debugphone${Date.now()}@example.com`,
            password: 'DebugPhonePassword123!',
            phone: testPhone
        });
        
        console.log(`✅ Success: ${response.status}`);
        console.log('Response:', response.data);
        
    } catch (error) {
        console.log(`❌ Error: ${error.response?.status}`);
        console.log('Error details:', error.response?.data);
        
        if (error.response?.data?.message) {
            console.log('Error message:', error.response.data.message);
        }
    }
}

debugPhoneError().catch(console.error);
