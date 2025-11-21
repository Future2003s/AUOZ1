const axios = require('axios');

const API_BASE_URL = 'http://localhost:8081/api/v1';

async function regressionTest() {
    console.log('🔍 Regression Test - Verifying Recent Fixes');
    console.log('🎯 Goal: Ensure no new issues introduced by recent changes');
    console.log('=' .repeat(70));
    
    const regressionResults = {
        timestamp: new Date().toISOString(),
        fixesVerified: {
            passwordValidation: { status: 'unknown', tests: [] },
            phoneValidation: { status: 'unknown', tests: [] },
            authController: { status: 'unknown', tests: [] }
        },
        overallStatus: 'unknown'
    };

    // Test 1: Password Validation Fix
    console.log('\n🔐 Testing Password Validation Fix');
    console.log('-'.repeat(40));

    const passwordTests = [
        { password: 'DebugPassword123!', shouldPass: true, description: 'Strong password with Debug prefix' },
        { password: 'TestPassword123!', shouldPass: true, description: 'Strong password with Test prefix' },
        { password: 'MySecurePass456@', shouldPass: true, description: 'Strong password with common words' },
        { password: 'password123', shouldPass: false, description: 'Weak password (exact match)' },
        { password: 'admin1', shouldPass: false, description: 'Weak password (admin + number)' },
        { password: '123456', shouldPass: false, description: 'Very weak password' }
    ];

    for (const test of passwordTests) {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                firstName: 'Password',
                lastName: 'Test',
                email: `pwtest${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
                password: test.password,
                phone: '+1234567890'
            });
            
            const passed = test.shouldPass && response.status === 201;
            const result = {
                password: test.password,
                description: test.description,
                expected: test.shouldPass ? 'PASS' : 'FAIL',
                actual: 'PASS',
                status: passed ? 'CORRECT' : 'INCORRECT',
                responseStatus: response.status
            };
            
            regressionResults.fixesVerified.passwordValidation.tests.push(result);
            console.log(`   ${passed ? '✅' : '❌'} ${test.description}: ${passed ? 'CORRECT' : 'INCORRECT'}`);
            
        } catch (error) {
            const failed = !test.shouldPass && error.response?.status === 400;
            const result = {
                password: test.password,
                description: test.description,
                expected: test.shouldPass ? 'PASS' : 'FAIL',
                actual: 'FAIL',
                status: failed ? 'CORRECT' : 'INCORRECT',
                responseStatus: error.response?.status || 0,
                error: error.response?.data?.message || error.message
            };
            
            regressionResults.fixesVerified.passwordValidation.tests.push(result);
            console.log(`   ${failed ? '✅' : '❌'} ${test.description}: ${failed ? 'CORRECT' : 'INCORRECT'}`);
        }
    }

    const passwordCorrect = regressionResults.fixesVerified.passwordValidation.tests.every(t => t.status === 'CORRECT');
    regressionResults.fixesVerified.passwordValidation.status = passwordCorrect ? 'PASS' : 'FAIL';

    // Test 2: Phone Validation Fix
    console.log('\n📱 Testing Phone Validation Fix');
    console.log('-'.repeat(40));

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
            const result = {
                phone: test.phone,
                description: test.description,
                expected: test.shouldPass ? 'PASS' : 'FAIL',
                actual: 'PASS',
                status: passed ? 'CORRECT' : 'INCORRECT',
                responseStatus: response.status
            };
            
            regressionResults.fixesVerified.phoneValidation.tests.push(result);
            console.log(`   ${passed ? '✅' : '❌'} ${test.description}: ${passed ? 'CORRECT' : 'INCORRECT'}`);
            
        } catch (error) {
            const failed = !test.shouldPass && error.response?.status === 400;
            const result = {
                phone: test.phone,
                description: test.description,
                expected: test.shouldPass ? 'PASS' : 'FAIL',
                actual: 'FAIL',
                status: failed ? 'CORRECT' : 'INCORRECT',
                responseStatus: error.response?.status || 0,
                error: error.response?.data?.message || error.message
            };
            
            regressionResults.fixesVerified.phoneValidation.tests.push(result);
            console.log(`   ${failed ? '✅' : '❌'} ${test.description}: ${failed ? 'CORRECT' : 'INCORRECT'}`);
        }
    }

    const phoneCorrect = regressionResults.fixesVerified.phoneValidation.tests.every(t => t.status === 'CORRECT');
    regressionResults.fixesVerified.phoneValidation.status = phoneCorrect ? 'PASS' : 'FAIL';

    // Test 3: Auth Controller Fix (req.user._id vs req.user.id)
    console.log('\n👤 Testing Auth Controller Fix');
    console.log('-'.repeat(40));

    try {
        // Register a user to get a token
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            firstName: 'Auth',
            lastName: 'Controller',
            email: `authtest${Date.now()}@example.com`,
            password: 'AuthControllerTest123!',
            phone: '+1234567890'
        });

        const token = registerResponse.data.data.token;
        
        // Test /auth/me endpoint multiple times to ensure consistency
        const authTests = [];
        for (let i = 1; i <= 3; i++) {
            try {
                const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                authTests.push({
                    run: i,
                    status: 'PASS',
                    responseStatus: meResponse.status,
                    userId: meResponse.data.data._id,
                    userEmail: meResponse.data.data.email
                });
                
                console.log(`   ✅ Auth /me test ${i}: SUCCESS (${meResponse.status})`);
                
            } catch (error) {
                authTests.push({
                    run: i,
                    status: 'FAIL',
                    responseStatus: error.response?.status || 0,
                    error: error.message
                });
                
                console.log(`   ❌ Auth /me test ${i}: FAILED (${error.response?.status || 'ERR'})`);
            }
        }
        
        const authCorrect = authTests.every(t => t.status === 'PASS');
        regressionResults.fixesVerified.authController.status = authCorrect ? 'PASS' : 'FAIL';
        regressionResults.fixesVerified.authController.tests = authTests;
        
    } catch (error) {
        console.log(`   ❌ Auth Controller test setup failed: ${error.message}`);
        regressionResults.fixesVerified.authController.status = 'FAIL';
        regressionResults.fixesVerified.authController.tests = [{ error: error.message }];
    }

    // Overall Assessment
    const allFixesWorking = Object.values(regressionResults.fixesVerified).every(fix => fix.status === 'PASS');
    regressionResults.overallStatus = allFixesWorking ? 'PASS' : 'FAIL';

    // Generate Report
    console.log('\n' + '='.repeat(70));
    console.log('📊 REGRESSION TEST RESULTS');
    console.log('='.repeat(70));

    console.log(`\n🔧 Fix Verification Results:`);
    console.log(`   Password Validation Fix: ${regressionResults.fixesVerified.passwordValidation.status === 'PASS' ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`   Phone Validation Fix: ${regressionResults.fixesVerified.phoneValidation.status === 'PASS' ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`   Auth Controller Fix: ${regressionResults.fixesVerified.authController.status === 'PASS' ? '✅ WORKING' : '❌ BROKEN'}`);

    console.log(`\n📈 Overall Regression Status:`);
    if (allFixesWorking) {
        console.log(`   🎉 NO REGRESSIONS DETECTED`);
        console.log(`   ✅ All recent fixes are working correctly`);
        console.log(`   ✅ No new issues introduced`);
        console.log(`   🚀 Safe for production deployment`);
    } else {
        console.log(`   ⚠️ REGRESSIONS DETECTED`);
        console.log(`   ❌ Some fixes may have issues`);
        console.log(`   🔧 Review failed tests above`);
    }

    // Detailed breakdown
    console.log(`\n📋 Detailed Test Results:`);
    
    console.log(`\n   Password Validation (${regressionResults.fixesVerified.passwordValidation.tests.length} tests):`);
    regressionResults.fixesVerified.passwordValidation.tests.forEach(test => {
        const icon = test.status === 'CORRECT' ? '✅' : '❌';
        console.log(`     ${icon} ${test.description}: ${test.status}`);
    });

    console.log(`\n   Phone Validation (${regressionResults.fixesVerified.phoneValidation.tests.length} tests):`);
    regressionResults.fixesVerified.phoneValidation.tests.forEach(test => {
        const icon = test.status === 'CORRECT' ? '✅' : '❌';
        console.log(`     ${icon} ${test.description}: ${test.status}`);
    });

    console.log(`\n   Auth Controller (${regressionResults.fixesVerified.authController.tests.length} tests):`);
    regressionResults.fixesVerified.authController.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`     ${icon} /auth/me test ${test.run || ''}: ${test.status}`);
    });

    console.log('\n' + '='.repeat(70));

    // Save report
    require('fs').writeFileSync('regression-report.json', JSON.stringify(regressionResults, null, 2));
    console.log('📄 Detailed regression report saved: regression-report.json');

    return regressionResults;
}

// Run regression test
regressionTest().catch(console.error);
