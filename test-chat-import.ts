// Test script to check if chat routes can be imported
try {
    console.log("1. Testing chatService import...");
    const chatService = require("./src/services/chatService");
    console.log("   ✅ chatService loaded:", Object.keys(chatService));
} catch (e: any) {
    console.error("   ❌ chatService error:", e.message);
}

try {
    console.log("2. Testing chatController import...");
    const chatController = require("./src/controllers/chatController");
    console.log("   ✅ chatController loaded:", Object.keys(chatController));
} catch (e: any) {
    console.error("   ❌ chatController error:", e.message);
}

try {
    console.log("3. Testing chat routes import...");
    const chatRoutes = require("./src/routes/chat");
    console.log("   ✅ chatRoutes loaded:", typeof chatRoutes.default || typeof chatRoutes);
} catch (e: any) {
    console.error("   ❌ chatRoutes error:", e.message);
}

try {
    console.log("4. Testing routes/index import...");
    const routes = require("./src/routes/index");
    console.log("   ✅ routes loaded:", typeof routes.default || typeof routes);
} catch (e: any) {
    console.error("   ❌ routes/index error:", e.message);
}
