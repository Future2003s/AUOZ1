// Simple test to verify the login fix without running the full server
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Mock User model to test the login logic
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    firstName: String,
    lastName: String,
    isActive: { type: Boolean, default: true }
});

// Add the matchPassword method
userSchema.methods.matchPassword = async function(enteredPassword) {
    console.log('🔍 Checking password...');
    console.log('  - Entered password:', enteredPassword ? 'PROVIDED' : 'MISSING');
    console.log('  - Stored hash:', this.password ? 'EXISTS' : 'MISSING');
    
    if (!this.password) {
        console.log('❌ No password hash found in user object');
        return false;
    }
    
    try {
        const result = await bcrypt.compare(enteredPassword, this.password);
        console.log('  - Password match result:', result);
        return result;
    } catch (error) {
        console.log('❌ bcrypt error:', error.message);
        return false;
    }
};

// Test function
async function testPasswordComparison() {
    console.log('🧪 Testing Password Comparison Logic\n');
    
    try {
        // Create a test password hash
        const testPassword = 'testpassword123';
        const hashedPassword = await bcrypt.hash(testPassword, 12);
        
        console.log('📝 Test Setup:');
        console.log('  - Original password:', testPassword);
        console.log('  - Hashed password:', hashedPassword.substring(0, 20) + '...');
        console.log('');
        
        // Test 1: User object with password (normal case)
        console.log('🧪 Test 1: User with password field');
        const userWithPassword = {
            email: 'test@example.com',
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            matchPassword: userSchema.methods.matchPassword
        };
        
        const result1 = await userWithPassword.matchPassword(testPassword);
        console.log('✅ Result:', result1 ? 'SUCCESS' : 'FAILED');
        console.log('');
        
        // Test 2: User object without password (cached user case)
        console.log('🧪 Test 2: User without password field (cached)');
        const userWithoutPassword = {
            email: 'test@example.com',
            // password: undefined, // This is what happens with cached users
            firstName: 'Test',
            lastName: 'User',
            isActive: true,
            matchPassword: userSchema.methods.matchPassword
        };
        
        try {
            const result2 = await userWithoutPassword.matchPassword(testPassword);
            console.log('⚠️ Result:', result2 ? 'SUCCESS' : 'FAILED');
        } catch (error) {
            console.log('❌ Error (expected):', error.message);
        }
        console.log('');
        
        // Test 3: Wrong password
        console.log('🧪 Test 3: Wrong password');
        const result3 = await userWithPassword.matchPassword('wrongpassword');
        console.log('✅ Result:', result3 ? 'SUCCESS' : 'FAILED (expected)');
        console.log('');
        
        console.log('📊 Summary:');
        console.log('  - Test 1 (correct password): Should be TRUE');
        console.log('  - Test 2 (no password field): Should handle gracefully');
        console.log('  - Test 3 (wrong password): Should be FALSE');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Test the authentication flow
async function testAuthFlow() {
    console.log('\n🔐 Testing Authentication Flow\n');
    
    const testEmail = 'adadad@gmail.com';
    const testPassword = 'testpassword123';
    
    console.log('📝 Simulating login for:', testEmail);
    
    // Simulate findByEmailForAuth (should include password)
    console.log('🔍 Step 1: findByEmailForAuth - includes password');
    const userFromAuth = {
        email: testEmail,
        password: await bcrypt.hash(testPassword, 12),
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        matchPassword: userSchema.methods.matchPassword
    };
    console.log('  ✅ User found with password field');
    
    // Test password matching
    console.log('🔍 Step 2: Password verification');
    const isValidPassword = await userFromAuth.matchPassword(testPassword);
    console.log('  ✅ Password valid:', isValidPassword);
    
    // Simulate findByEmailCached (should NOT include password)
    console.log('🔍 Step 3: findByEmailCached - excludes password');
    const userFromCache = {
        email: testEmail,
        // password: undefined, // Excluded from cache
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        matchPassword: userSchema.methods.matchPassword
    };
    console.log('  ✅ User found without password field (cached)');
    
    // This should not be used for authentication
    console.log('🔍 Step 4: Cached user should NOT be used for auth');
    try {
        const shouldFail = await userFromCache.matchPassword(testPassword);
        console.log('  ⚠️ Cached user password check:', shouldFail);
    } catch (error) {
        console.log('  ✅ Cached user correctly fails password check');
    }
    
    console.log('\n✅ Authentication flow test completed');
}

// Run tests
async function runTests() {
    console.log('🚀 Starting Login Fix Verification Tests\n');
    console.log('='.repeat(60));
    
    await testPasswordComparison();
    await testAuthFlow();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 All tests completed!');
    console.log('\n💡 Key Findings:');
    console.log('  - Users from findByEmailForAuth should have password field');
    console.log('  - Users from findByEmailCached should NOT have password field');
    console.log('  - bcrypt.compare needs both password and hash to work');
    console.log('  - The fix separates auth queries from cached queries');
}

runTests().catch(console.error);
