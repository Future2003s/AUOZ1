const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function quickLoginTest() {
    console.log('🧪 Quick Login Test\n');

    try {
        // Test login with existing user
        const loginData = {
            email: 'adadad@gmail.com',
            password: 'testpassword123' // Adjust this to match your test user's password
        };

        console.log('📝 Testing login for:', loginData.email);
        console.log('🔐 Attempting login...\n');

        const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Login successful!');
        console.log('📊 Status:', response.status);
        console.log('📝 Message:', response.data.message);
        console.log('👤 User ID:', response.data.data?.user?._id);
        console.log('📧 Email:', response.data.data?.user?.email);
        console.log('🔑 Token length:', response.data.data?.token?.length || 0);
        console.log('🔄 Refresh token length:', response.data.data?.refreshToken?.length || 0);

    } catch (error) {
        console.error('❌ Login failed:');
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📝 Message:', error.response.data?.message || error.response.data?.error);
            console.error('🔍 Details:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('🌐 No response received');
            console.error('🔍 Request error:', error.message);
        } else {
            console.error('⚠️ Error:', error.message);
        }
    }
}

// Check if server is running first
async function checkServer() {
    try {
        const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
            timeout: 5000
        });
        console.log('✅ Server is running');
        return true;
    } catch (error) {
        console.error('❌ Server is not running or not accessible');
        console.error('🔍 Make sure the server is started with: npm run dev');
        return false;
    }
}

async function main() {
    console.log('🚀 Starting Quick Login Test\n');
    
    const serverRunning = await checkServer();
    if (!serverRunning) {
        process.exit(1);
    }
    
    await quickLoginTest();
}

main().catch(console.error);
