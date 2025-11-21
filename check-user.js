const mongoose = require("mongoose");

// Connect to MongoDB
async function checkUser() {
    try {
        await mongoose.connect("mongodb://localhost:27017/ShopDev");
        console.log("Connected to MongoDB");

        // Get the User model
        const userSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model("User", userSchema);

        // Find the most recent user
        const recentUser = await User.findOne().sort({ createdAt: -1 });

        if (recentUser) {
            console.log("Most recent user:");
            console.log("Email:", recentUser.email);
            console.log("isEmailVerified:", recentUser.isEmailVerified);
            console.log("isActive:", recentUser.isActive);
            console.log("emailVerificationToken:", recentUser.emailVerificationToken);
            console.log("Created at:", recentUser.createdAt);
        } else {
            console.log("No users found");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkUser();
