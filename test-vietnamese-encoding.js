const mongoose = require('mongoose');

async function testVietnameseEncoding() {
    console.log('🔍 Testing Vietnamese Character Encoding in MongoDB');
    console.log('=' .repeat(60));
    
    try {
        // Connect to MongoDB Cloud
        const uri = 'mongodb+srv://phamhongsang12x10:gpDc63UpfZLTy6Uw@cluster0.loq8seh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        
        console.log('🔗 Connecting to MongoDB Cloud...');
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB Cloud successfully!');
        
        // Define User schema with proper encoding
        const userSchema = new mongoose.Schema({
            firstName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 50
            },
            lastName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 50
            },
            email: {
                type: String,
                required: true,
                unique: true
            },
            role: {
                type: String,
                default: 'customer'
            }
        }, {
            collation: { locale: 'vi', strength: 2 }
        });
        
        const TestUser = mongoose.model('TestUser', userSchema);
        
        // Test data with Vietnamese characters
        const testData = [
            {
                firstName: "Phạm",
                lastName: "Sáng",
                email: "test1@example.com",
                role: "customer"
            },
            {
                firstName: "Nguyễn",
                lastName: "Thị",
                email: "test2@example.com",
                role: "customer"
            },
            {
                firstName: "Trần",
                lastName: "Văn",
                email: "test3@example.com",
                role: "customer"
            }
        ];
        
        console.log('\n📝 Testing Vietnamese character insertion...');
        
        // Clear existing test data
        await TestUser.deleteMany({ email: { $regex: /^test\d@example\.com$/ } });
        console.log('   ✅ Cleared existing test data');
        
        // Insert test data
        const insertedUsers = await TestUser.insertMany(testData);
        console.log(`   ✅ Inserted ${insertedUsers.length} test users`);
        
        // Verify the data was saved correctly
        console.log('\n🔍 Verifying saved data...');
        const savedUsers = await TestUser.find({ email: { $regex: /^test\d@example\.com$/ } });
        
        savedUsers.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
            console.log(`      firstName: "${user.firstName}" (length: ${user.firstName.length})`);
            console.log(`      lastName: "${user.lastName}" (length: ${user.lastName.length})`);
            
            // Check if encoding is correct
            const expectedFirstName = testData[index].firstName;
            const expectedLastName = testData[index].lastName;
            
            if (user.firstName === expectedFirstName && user.lastName === expectedLastName) {
                console.log(`      ✅ Encoding correct`);
            } else {
                console.log(`      ❌ Encoding incorrect`);
                console.log(`         Expected: "${expectedFirstName}" "${expectedLastName}"`);
                console.log(`         Got: "${user.firstName}" "${user.lastName}"`);
            }
        });
        
        // Clean up test data
        await TestUser.deleteMany({ email: { $regex: /^test\d@example\.com$/ } });
        console.log('\n🧹 Cleaned up test data');
        
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB Cloud');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n' + '='.repeat(60));
}

// Run the test
testVietnameseEncoding();
