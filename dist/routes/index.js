"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const products_1 = __importDefault(require("./products"));
const categories_1 = __importDefault(require("./categories"));
const brands_1 = __importDefault(require("./brands"));
const orders_1 = __importDefault(require("./orders"));
const cart_1 = __importDefault(require("./cart"));
const reviews_1 = __importDefault(require("./reviews"));
const admin_1 = __importDefault(require("./admin"));
const performance_1 = __importDefault(require("./performance"));
const translations_1 = __importDefault(require("./translations"));
const analytics_1 = __importDefault(require("./analytics"));
const homepage_1 = __importDefault(require("./homepage"));
const advertisements_1 = __importDefault(require("./advertisements"));
const activities_1 = __importDefault(require("./activities"));
const comments_1 = __importDefault(require("./comments"));
const complaints_1 = __importDefault(require("./complaints"));
const vouchers_1 = __importDefault(require("./vouchers"));
const news_1 = __importDefault(require("./news"));
const flowerLogs_1 = __importDefault(require("./flowerLogs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Home page route
router.get("/", (req, res) => {
    const indexPath = path_1.default.join(__dirname, "../views/index.html");
    if (fs_1.default.existsSync(indexPath)) {
        const indexHtml = fs_1.default.readFileSync(indexPath, "utf8");
        return res.type("html").send(indexHtml);
    }
    // Fallback if HTML file doesn't exist
    res.type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ShopDev API</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #333; }
                p { color: #666; }
            </style>
        </head>
        <body>
            <h1>🛍️ ShopDev API</h1>
            <p>E-commerce API is running successfully!</p>
            <p><a href="/api/v1/health">Health Check</a></p>
        </body>
        </html>
    `);
});
// Test route (no database required)
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "API is working!",
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: {
                register: "POST /api/v1/auth/register",
                login: "POST /api/v1/auth/login",
                me: "GET /api/v1/auth/me (requires token)",
                changePassword: "PUT /api/v1/auth/change-password (requires token)"
            },
            users: {
                profile: "GET /api/v1/users/profile (requires token)",
                updateProfile: "PUT /api/v1/users/profile (requires token)",
                addresses: "GET /api/v1/users/addresses (requires token)"
            }
        }
    });
});
// API Routes
router.use("/auth", auth_1.default);
router.use("/users", users_1.default);
router.use("/products", products_1.default);
router.use("/categories", categories_1.default);
router.use("/brands", brands_1.default);
router.use("/orders", orders_1.default);
router.use("/cart", cart_1.default);
router.use("/reviews", reviews_1.default);
router.use("/admin", admin_1.default);
router.use("/performance", performance_1.default);
router.use("/translations", translations_1.default);
router.use("/analytics", analytics_1.default);
router.use("/homepage", homepage_1.default);
router.use("/advertisements", advertisements_1.default);
router.use("/activities", activities_1.default);
router.use("/complaints", complaints_1.default);
router.use("/vouchers", vouchers_1.default);
router.use("/news", news_1.default);
router.use("/comments", comments_1.default);
router.use("/flower-logs", flowerLogs_1.default);
exports.default = router;
