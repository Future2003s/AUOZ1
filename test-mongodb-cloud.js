const mongoose = require("mongoose");

async function testMongoDBCloud() {
    console.log("🔍 Testing MongoDB Cloud Connection and Data");
    console.log("=".repeat(60));

    try {
        // Connect to MongoDB Cloud
        const uri =
            "mongodb+srv://phamhongsang12x10:gpDc63UpfZLTy6Uw@cluster0.loq8seh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

        console.log("🔗 Connecting to MongoDB Cloud...");
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB Cloud successfully!");

        // Get database info
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("\n📊 Database Collections:");
        collections.forEach((col) => {
            console.log(`   - ${col.name}`);
        });

        // Check if users collection exists
        const usersCollection = collections.find((col) => col.name === "users");
        if (usersCollection) {
            console.log("\n👥 Users Collection Found!");

            // Get users count
            const usersCount = await db.collection("users").countDocuments();
            console.log(`   Total Users: ${usersCount}`);

            if (usersCount > 0) {
                // Get first few users
                const users = await db.collection("users").find().limit(5).toArray();
                console.log("\n📋 Sample Users:");
                users.forEach((user, index) => {
                    console.log(
                        `   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`
                    );
                });
            } else {
                console.log("   ❌ No users found in collection");
            }
        } else {
            console.log("\n❌ Users collection not found");

            // Check what collections exist
            console.log("\n🔍 Available Collections:");
            collections.forEach((col) => {
                console.log(`   - ${col.name}`);
            });
        }

        // Check for any collection that might contain users
        for (const collection of collections) {
            if (collection.name.includes("user") || collection.name.includes("User")) {
                console.log(`\n🔍 Checking collection: ${collection.name}`);
                const count = await db.collection(collection.name).countDocuments();
                console.log(`   Documents count: ${count}`);

                if (count > 0) {
                    const sample = await db.collection(collection.name).find().limit(2).toArray();
                    console.log(`   Sample data:`, JSON.stringify(sample, null, 2));
                }
            }
        }

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB Cloud");
    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.name === "MongoServerSelectionError") {
            console.error("   This usually means the connection string is wrong or network issues");
        }
    }

    console.log("\n" + "=".repeat(60));
}

// Run the test
testMongoDBCloud();
