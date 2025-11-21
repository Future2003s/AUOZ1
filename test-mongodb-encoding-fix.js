const mongoose = require("mongoose");

async function testMongoDBEncodingFix() {
    console.log("🔍 Testing MongoDB Cloud Encoding Fix");
    console.log("=".repeat(60));

    try {
        // Connect to MongoDB Cloud with explicit encoding
        const uri =
            "mongodb+srv://phamhongsang12x10:gpDc63UpfZLTy6Uw@cluster0.loq8seh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

        console.log("🔗 Connecting to MongoDB Cloud...");
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB Cloud successfully!");

        // Get database info
        const db = mongoose.connection.db;

        // Test 1: Check current database encoding
        console.log("\n📊 Database Info:");
        console.log(`   Database Name: ${db.databaseName}`);

        // Test 2: Create a test collection with explicit collation
        const testCollection = db.collection("encoding_test");

        // Test 3: Insert Vietnamese text with explicit encoding
        const testData = {
            firstName: "Trần",
            lastName: "Văn",
            email: "test-encoding@example.com",
            timestamp: new Date()
        };

        console.log("\n📝 Inserting test data with Vietnamese characters...");
        console.log(`   Input: firstName="${testData.firstName}", lastName="${testData.lastName}"`);

        // Insert without collation (it's handled at schema level)
        const result = await testCollection.insertOne(testData);

        console.log(`   ✅ Inserted with ID: ${result.insertedId}`);

        // Test 4: Retrieve and check encoding
        console.log("\n🔍 Retrieving data to check encoding...");
        const retrieved = await testCollection.findOne({ _id: result.insertedId });

        if (retrieved) {
            console.log(`   Retrieved: firstName="${retrieved.firstName}", lastName="${retrieved.lastName}"`);

            // Check if encoding is correct
            if (retrieved.firstName === testData.firstName && retrieved.lastName === testData.lastName) {
                console.log("   ✅ Encoding is correct!");
            } else {
                console.log("   ❌ Encoding is still incorrect");
                console.log(`      Expected: "${testData.firstName}" "${testData.lastName}"`);
                console.log(`      Got: "${retrieved.firstName}" "${retrieved.lastName}"`);
            }
        }

        // Test 5: Check if we can update existing users with correct encoding
        console.log("\n🔧 Testing update of existing users...");
        const usersCollection = db.collection("users");

        // Find a user with incorrect encoding
        const userWithBadEncoding = await usersCollection.findOne({
            firstName: { $regex: /Nguy\?n/ }
        });

        if (userWithBadEncoding) {
            console.log(`   Found user with bad encoding: ${userWithBadEncoding.email}`);
            console.log(
                `   Current: firstName="${userWithBadEncoding.firstName}", lastName="${userWithBadEncoding.lastName}"`
            );

            // Try to update with correct encoding
            const correctFirstName = "Nguyễn";
            const correctLastName = "Thị";

            console.log(`   Updating to: firstName="${correctFirstName}", lastName="${correctLastName}"`);

            const updateResult = await usersCollection.updateOne(
                { _id: userWithBadEncoding._id },
                {
                    $set: {
                        firstName: correctFirstName,
                        lastName: correctLastName,
                        updatedAt: new Date()
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                console.log("   ✅ Update successful");

                // Verify the update
                const updatedUser = await usersCollection.findOne({ _id: userWithBadEncoding._id });
                if (updatedUser) {
                    console.log(
                        `   Verified: firstName="${updatedUser.firstName}", lastName="${updatedUser.lastName}"`
                    );
                }
            } else {
                console.log("   ❌ Update failed");
            }
        } else {
            console.log("   No users with bad encoding found to test update");
        }

        // Clean up test data
        await testCollection.deleteOne({ _id: result.insertedId });
        console.log("\n🧹 Cleaned up test data");

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB Cloud");
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Stack:", error.stack);
    }

    console.log("\n" + "=".repeat(60));
}

// Run the test
testMongoDBEncodingFix();
