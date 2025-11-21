const fs = require('fs');
const {
    testServerHealth,
    testAuthenticationAPIs,
    testUserManagementAPIs,
    testProductAPIs,
    testCartAPIs,
    testOrderAPIs,
    testAdminAPIs,
    testSecurityAndValidation,
    testCORSAndHeaders,
    TEST_RESULTS
} = require('./comprehensive-api-test');

async function runAllTests() {
    console.log('🚀 Starting Comprehensive API Testing Suite');
    console.log('=' .repeat(80));
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    console.log(`🌐 API Base URL: http://localhost:8081/api/v1`);
    console.log('=' .repeat(80));

    const startTime = Date.now();
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    try {
        // Test 1: Server Health
        const serverHealthy = await testServerHealth();
        if (!serverHealthy) {
            console.log('\n❌ Server is not running. Please start the server first.');
            console.log('   Run: npm run dev');
            process.exit(1);
        }

        // Test 2: Authentication APIs
        await testAuthenticationAPIs();

        // Test 3: User Management APIs
        await testUserManagementAPIs();

        // Test 4: Product APIs
        await testProductAPIs();

        // Test 5: Cart APIs
        await testCartAPIs();

        // Test 6: Order APIs
        await testOrderAPIs();

        // Test 7: Admin APIs
        await testAdminAPIs();

        // Test 8: Security & Validation
        await testSecurityAndValidation();

        // Test 9: CORS & Headers
        await testCORSAndHeaders();

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error.message);
    }

    // Calculate results
    totalTests = TEST_RESULTS.length;
    passedTests = TEST_RESULTS.filter(r => r.success).length;
    failedTests = totalTests - passedTests;

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Generate summary report
    generateSummaryReport(totalTests, passedTests, failedTests, duration);
    
    // Generate detailed report
    generateDetailedReport();
    
    // Generate JSON report
    generateJSONReport();

    console.log('\n' + '='.repeat(80));
    console.log('🏁 API Testing Complete!');
    console.log(`📊 Results: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
    console.log('📄 Reports generated:');
    console.log('   - api-test-summary.txt');
    console.log('   - api-test-detailed.html');
    console.log('   - api-test-results.json');
    console.log('='.repeat(80));
}

function generateSummaryReport(total, passed, failed, duration) {
    const successRate = ((passed / total) * 100).toFixed(1);
    
    const summary = `
# API Testing Summary Report
Generated: ${new Date().toISOString()}
Duration: ${duration.toFixed(2)} seconds

## Overall Results
- Total Tests: ${total}
- Passed: ${passed}
- Failed: ${failed}
- Success Rate: ${successRate}%

## Test Categories Summary
${generateCategorySummary()}

## Failed Tests
${generateFailedTestsSummary()}

## Recommendations
${generateRecommendations()}
`;

    fs.writeFileSync('api-test-summary.txt', summary);
}

function generateCategorySummary() {
    const categories = {};
    
    TEST_RESULTS.forEach(result => {
        if (!categories[result.category]) {
            categories[result.category] = { total: 0, passed: 0 };
        }
        categories[result.category].total++;
        if (result.success) {
            categories[result.category].passed++;
        }
    });

    let summary = '';
    Object.entries(categories).forEach(([category, stats]) => {
        const rate = ((stats.passed / stats.total) * 100).toFixed(1);
        summary += `- ${category}: ${stats.passed}/${stats.total} (${rate}%)\n`;
    });

    return summary;
}

function generateFailedTestsSummary() {
    const failedTests = TEST_RESULTS.filter(r => !r.success);
    
    if (failedTests.length === 0) {
        return '✅ No failed tests!';
    }

    let summary = '';
    failedTests.forEach(test => {
        summary += `- ${test.category} - ${test.method} ${test.endpoint}: ${test.message}\n`;
        if (test.data && test.data.message) {
            summary += `  Error: ${test.data.message}\n`;
        }
    });

    return summary;
}

function generateRecommendations() {
    const failedTests = TEST_RESULTS.filter(r => !r.success);
    const recommendations = [];

    // Analyze failed tests and generate recommendations
    const authFailures = failedTests.filter(t => t.category === 'Auth').length;
    const adminFailures = failedTests.filter(t => t.category === 'Admin').length;
    const securityFailures = failedTests.filter(t => t.category === 'Security').length;

    if (authFailures > 0) {
        recommendations.push('- Review authentication implementation and JWT token handling');
    }
    
    if (adminFailures > 0) {
        recommendations.push('- Check admin role-based access control implementation');
    }
    
    if (securityFailures > 0) {
        recommendations.push('- Enhance input validation and security measures');
    }

    const corsFailures = failedTests.filter(t => t.category === 'CORS').length;
    if (corsFailures > 0) {
        recommendations.push('- Configure CORS settings for frontend integration');
    }

    if (recommendations.length === 0) {
        return '✅ All tests passed! API is ready for production.';
    }

    return recommendations.join('\n');
}

function generateDetailedReport() {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>API Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .passed { border-left: 4px solid #4CAF50; }
        .failed { border-left: 4px solid #f44336; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .test-passed { background: #e8f5e8; }
        .test-failed { background: #ffeaea; }
        .category { font-weight: bold; color: #333; margin-top: 20px; }
        .endpoint { font-family: monospace; background: #f0f0f0; padding: 2px 4px; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 API Test Results</h1>
        <p>Generated: ${new Date().toISOString()}</p>
    </div>

    <div class="summary">
        <div class="stat-card passed">
            <h3>✅ Passed</h3>
            <h2>${TEST_RESULTS.filter(r => r.success).length}</h2>
        </div>
        <div class="stat-card failed">
            <h3>❌ Failed</h3>
            <h2>${TEST_RESULTS.filter(r => !r.success).length}</h2>
        </div>
        <div class="stat-card">
            <h3>📊 Total</h3>
            <h2>${TEST_RESULTS.length}</h2>
        </div>
    </div>

    <h2>Test Results by Category</h2>
    ${generateHTMLResults()}
</body>
</html>`;

    fs.writeFileSync('api-test-detailed.html', html);
}

function generateHTMLResults() {
    const categories = {};
    
    TEST_RESULTS.forEach(result => {
        if (!categories[result.category]) {
            categories[result.category] = [];
        }
        categories[result.category].push(result);
    });

    let html = '';
    Object.entries(categories).forEach(([category, results]) => {
        html += `<div class="category">${category} APIs</div>`;
        
        results.forEach(result => {
            const statusClass = result.success ? 'test-passed' : 'test-failed';
            const statusIcon = result.success ? '✅' : '❌';
            
            html += `
                <div class="test-result ${statusClass}">
                    <strong>${statusIcon} ${result.method} <span class="endpoint">${result.endpoint}</span></strong>
                    <span class="timestamp">[${result.status}]</span>
                    <br>
                    ${result.message}
                    ${result.data && !result.success ? `<br><small>Error: ${JSON.stringify(result.data, null, 2)}</small>` : ''}
                </div>
            `;
        });
    });

    return html;
}

function generateJSONReport() {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: TEST_RESULTS.length,
            passed: TEST_RESULTS.filter(r => r.success).length,
            failed: TEST_RESULTS.filter(r => !r.success).length,
            successRate: ((TEST_RESULTS.filter(r => r.success).length / TEST_RESULTS.length) * 100).toFixed(1)
        },
        results: TEST_RESULTS
    };

    fs.writeFileSync('api-test-results.json', JSON.stringify(report, null, 2));
}

// Run the tests
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };
