#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Authentication System
 * Runs all test suites and generates detailed reports
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class TestRunner {
    constructor() {
        this.results = {
            unit: null,
            integration: null,
            security: null,
            performance: null,
            coverage: null
        };
        this.startTime = Date.now();
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            console.log(`\n🚀 Running: ${command} ${args.join(" ")}`);

            const child = spawn(command, args, {
                stdio: "inherit",
                shell: true,
                ...options
            });

            child.on("close", (code) => {
                if (code === 0) {
                    resolve({ success: true, code });
                } else {
                    resolve({ success: false, code });
                }
            });

            child.on("error", (error) => {
                reject(error);
            });
        });
    }

    async runTestSuite(name, command) {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`🧪 Running ${name} Tests`);
        console.log(`${"=".repeat(60)}`);

        const startTime = Date.now();
        const result = await this.runCommand("npm", ["run", command]);
        const duration = Date.now() - startTime;

        this.results[name.toLowerCase()] = {
            success: result.success,
            duration,
            command
        };

        console.log(
            `\n${result.success ? "✅" : "❌"} ${name} tests ${result.success ? "passed" : "failed"} in ${duration}ms`
        );

        return result.success;
    }

    async checkPrerequisites() {
        console.log("\n🔍 Checking prerequisites...");

        // Check if required files exist
        const requiredFiles = [
            "jest.config.js",
            "tests/setup.ts",
            "tests/globalSetup.ts",
            "tests/globalTeardown.ts",
            "tests/unit/authService.test.ts",
            "tests/integration/auth.test.ts",
            "tests/security/security.test.ts",
            "tests/performance/performance.test.ts"
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Required file missing: ${file}`);
                return false;
            }
        }

        // Check if dependencies are installed
        if (!fs.existsSync("node_modules")) {
            console.log("📦 Installing dependencies...");
            const installResult = await this.runCommand("npm", ["install"]);
            if (!installResult.success) {
                console.error("❌ Failed to install dependencies");
                return false;
            }
        }

        console.log("✅ All prerequisites met");
        return true;
    }

    async runAllTests() {
        console.log("\n🎯 Starting Comprehensive Test Suite");
        console.log(`Started at: ${new Date().toISOString()}`);

        // Check prerequisites
        const prereqsOk = await this.checkPrerequisites();
        if (!prereqsOk) {
            console.error("❌ Prerequisites check failed");
            process.exit(1);
        }

        let allPassed = true;

        try {
            // Run unit tests
            const unitPassed = await this.runTestSuite("Unit", "test:unit");
            allPassed = allPassed && unitPassed;

            // Run integration tests
            const integrationPassed = await this.runTestSuite("Integration", "test:integration");
            allPassed = allPassed && integrationPassed;

            // Run security tests
            const securityPassed = await this.runTestSuite("Security", "test:security");
            allPassed = allPassed && securityPassed;

            // Run performance tests
            const performancePassed = await this.runTestSuite("Performance", "test:performance");
            allPassed = allPassed && performancePassed;

            // Generate coverage report
            console.log(`\n${"=".repeat(60)}`);
            console.log("📊 Generating Coverage Report");
            console.log(`${"=".repeat(60)}`);

            const coverageResult = await this.runCommand("npm", ["run", "test:coverage"]);
            this.results.coverage = {
                success: coverageResult.success,
                duration: 0,
                command: "test:coverage"
            };
        } catch (error) {
            console.error("❌ Test execution failed:", error);
            allPassed = false;
        }

        // Generate final report
        this.generateReport(allPassed);

        return allPassed;
    }

    generateReport(allPassed) {
        const totalDuration = Date.now() - this.startTime;

        console.log("\n" + "=".repeat(80));
        console.log("📋 TEST EXECUTION SUMMARY");
        console.log("=".repeat(80));

        console.log(`\n⏱️  Total Execution Time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
        console.log(`📅 Completed at: ${new Date().toISOString()}`);

        console.log("\n📊 Test Suite Results:");
        console.log("-".repeat(50));

        Object.entries(this.results).forEach(([suite, result]) => {
            if (result) {
                const status = result.success ? "✅ PASS" : "❌ FAIL";
                const duration = result.duration ? `${result.duration}ms` : "N/A";
                console.log(`${status} ${suite.toUpperCase().padEnd(12)} ${duration.padStart(8)}`);
            }
        });

        console.log("\n" + "=".repeat(80));

        if (allPassed) {
            console.log("🎉 ALL TESTS PASSED! System is ready for production.");
            console.log("\n✅ Next Steps:");
            console.log("   1. Review coverage report in coverage/ directory");
            console.log("   2. Deploy to staging environment");
            console.log("   3. Run production smoke tests");
            console.log("   4. Monitor performance metrics");
        } else {
            console.log("❌ SOME TESTS FAILED! Please review and fix issues.");
            console.log("\n🔧 Troubleshooting:");
            console.log("   1. Check individual test logs above");
            console.log("   2. Run specific test suites: npm run test:unit, test:integration, etc.");
            console.log("   3. Check test setup and configuration");
            console.log("   4. Verify database and cache connections");
        }

        console.log("\n📖 Documentation:");
        console.log("   - Optimization Report: OPTIMIZATION_REPORT.md");
        console.log("   - Security Audit: SECURITY_AUDIT_REPORT.md");
        console.log("   - Frontend Integration: FRONTEND_INTEGRATION_GUIDE.md");

        console.log("\n" + "=".repeat(80));
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const runner = new TestRunner();

    runner
        .runAllTests()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("❌ Test runner failed:", error);
            process.exit(1);
        });
}

module.exports = TestRunner;
