require("dotenv").config();
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const path = require("path");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("🔍 Testing Cloudinary Configuration...\n");

// Check environment variables
console.log("Environment Variables:");
console.log("  CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ Set" : "❌ Missing");
console.log("  CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "✅ Set" : "❌ Missing");
console.log("  CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "✅ Set (hidden)" : "❌ Missing");
console.log("");

// Test Cloudinary connection
async function testCloudinary() {
    try {
        console.log("📤 Testing Cloudinary connection...");
        
        // Test 1: Check configuration
        const config = cloudinary.config();
        console.log("  Cloud Name:", config.cloud_name || "❌ Not set");
        console.log("  API Key:", config.api_key ? "✅ Set" : "❌ Not set");
        console.log("  API Secret:", config.api_secret ? "✅ Set" : "❌ Not set");
        console.log("");

        // Test 2: Ping Cloudinary API
        console.log("🌐 Pinging Cloudinary API...");
        const pingResult = await cloudinary.api.ping();
        console.log("  Status:", pingResult.status === "ok" ? "✅ Connected" : "❌ Failed");
        console.log("");

        // Test 3: Upload a test image (if test image exists)
        const testImagePath = path.join(__dirname, "test-image.png");
        if (fs.existsSync(testImagePath)) {
            console.log("📸 Uploading test image...");
            const uploadResult = await cloudinary.uploader.upload(testImagePath, {
                folder: "test",
                public_id: "test-avatar-upload",
                overwrite: true,
            });
            console.log("  ✅ Upload successful!");
            console.log("  URL:", uploadResult.secure_url);
            console.log("  Public ID:", uploadResult.public_id);
            console.log("");

            // Test 4: Delete test image
            console.log("🗑️  Deleting test image...");
            const deleteResult = await cloudinary.uploader.destroy(uploadResult.public_id);
            console.log("  Status:", deleteResult.result === "ok" ? "✅ Deleted" : "❌ Failed");
            console.log("");
        } else {
            console.log("ℹ️  No test image found, skipping upload test");
            console.log("  (Create a test-image.png file in root directory to test upload)");
            console.log("");
        }

        // Test 5: Test buffer upload (simulate avatar upload)
        console.log("💾 Testing buffer upload (avatar simulation)...");
        const testBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
        
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "test",
                    public_id: "test-buffer-upload",
                    overwrite: true,
                },
                async (error, result) => {
                    if (error) {
                        console.log("  ❌ Buffer upload failed:", error.message);
                        reject(error);
                        return;
                    }

                    if (!result) {
                        console.log("  ❌ No result from upload");
                        reject(new Error("No result"));
                        return;
                    }

                    console.log("  ✅ Buffer upload successful!");
                    console.log("  URL:", result.secure_url);
                    console.log("  Public ID:", result.public_id);
                    console.log("");

                    // Delete test buffer upload
                    console.log("🗑️  Deleting test buffer upload...");
                    const deleteResult = await cloudinary.uploader.destroy(result.public_id);
                    console.log("  Status:", deleteResult.result === "ok" ? "✅ Deleted" : "❌ Failed");
                    console.log("");

                    resolve(result);
                }
            );

            uploadStream.end(testBuffer);
        });

    } catch (error) {
        console.error("❌ Cloudinary test failed:", error.message);
        if (error.http_code) {
            console.error("  HTTP Code:", error.http_code);
        }
        if (error.message.includes("Invalid API Key")) {
            console.error("\n💡 Tip: Check your CLOUDINARY_API_KEY in .env file");
        }
        if (error.message.includes("Invalid API Secret")) {
            console.error("\n💡 Tip: Check your CLOUDINARY_API_SECRET in .env file");
        }
        throw error;
    }
}

// Run test
testCloudinary()
    .then(() => {
        console.log("✅ All Cloudinary tests passed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Cloudinary test failed!");
        console.error("Error:", error.message);
        process.exit(1);
    });

