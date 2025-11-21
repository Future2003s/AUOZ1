const mongoose = require("mongoose");

async function fixMongoDBEncoding() {
    console.log("🔧 Fixing MongoDB Cloud Atlas Encoding");
    console.log("=".repeat(60));

    try {
        const uri =
            "mongodb+srv://phamhongsang12x10:gpDc63UpfZLTy6Uw@cluster0.loq8seh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

        console.log("🔗 Connecting to MongoDB Cloud...");
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB Cloud successfully!");

        const db = mongoose.connection.db;

        // Step 1: Create a new collection with proper collation
        console.log("\n📝 Creating new users collection with proper collation...");

        try {
            // Drop the old collection
            await db.collection("users").drop();
            console.log("   ✅ Dropped old users collection");
        } catch (error) {
            console.log("   ℹ️ Old collection already dropped or doesn't exist");
        }

        // Create new collection with explicit collation
        await db.createCollection("users", {
            collation: { locale: "vi", strength: 2 }
        });
        console.log("   ✅ Created new users collection with Vietnamese collation");

        // Step 2: Insert test data to verify encoding
        console.log("\n📝 Inserting test data to verify encoding...");

        const testUsers = [
            {
                firstName: "Phạm",
                lastName: "Sáng",
                email: "phamsang1210z9@gmail.com",
                password: "$2b$12$W3RtxvUOSdeZim846erT6ux/zU1aap2mOoPRBNgBrEk/4ht3CS9xu",
                role: "admin",
                isActive: true,
                isEmailVerified: true,
                preferences: {
                    language: "en",
                    currency: "USD",
                    notifications: { email: true, sms: false, push: true }
                },
                addresses: [],
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                firstName: "Nguyễn",
                lastName: "Thị",
                email: "nguyenthi@example.com",
                password: "$2b$12$AB3d97OpEAGWo3pXlvUT5u6cvKqS6z.TWNWMQn/X5AgYpeXh.tTTS",
                role: "customer",
                isActive: true,
                isEmailVerified: true,
                preferences: {
                    language: "en",
                    currency: "USD",
                    notifications: { email: true, sms: false, push: true }
                },
                addresses: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        const usersCollection = db.collection("users");
        const result = await usersCollection.insertMany(testUsers);
        console.log(`   ✅ Inserted ${result.insertedIds.length} test users`);

        // Step 3: Verify encoding
        console.log("\n🔍 Verifying encoding...");

        for (const user of testUsers) {
            const retrieved = await usersCollection.findOne({ email: user.email });
            if (retrieved) {
                console.log(`   User: ${retrieved.firstName} ${retrieved.lastName}`);
                if (retrieved.firstName === user.firstName && retrieved.lastName === user.lastName) {
                    console.log(`   ✅ Encoding correct for ${user.email}`);
                } else {
                    console.log(`   ❌ Encoding incorrect for ${user.email}`);
                    console.log(`      Expected: "${user.firstName}" "${user.lastName}"`);
                    console.log(`      Got: "${retrieved.firstName}" "${retrieved.lastName}"`);
                }
            }
        }

        // Step 4: Test API registration
        console.log("\n🧪 Testing API registration...");
        console.log("   Now try registering a new user via API to see if encoding works");

        await mongoose.disconnect();
        console.log("\n✅ Disconnected from MongoDB Cloud");
    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Stack:", error.stack);
    }

    console.log("\n" + "=".repeat(60));
}

// Run the fix
fixMongoDBEncoding();
