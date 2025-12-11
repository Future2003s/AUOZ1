"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAnalyticsCache = exports.exportAnalytics = exports.getConversionFunnel = exports.getTopProducts = exports.getPerformanceAnalytics = exports.getRealTimeAnalytics = exports.getUserAnalytics = exports.getProductAnalytics = exports.getDashboardAnalytics = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const apiResponse_1 = require("../utils/apiResponse");
const eventService_1 = require("../services/eventService");
const performance_1 = require("../utils/performance");
const cacheService_1 = require("../services/cacheService");
const Product_1 = require("../models/Product");
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
/**
 * Analytics Controller for ShopDev
 * Provides comprehensive analytics and insights
 */
/**
 * Get dashboard analytics overview
 */
exports.getDashboardAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const cacheKey = "dashboard_analytics";
    // Try cache first
    let analytics = await cacheService_1.cacheService.get("analytics", cacheKey);
    if (!analytics) {
        // Calculate analytics
        const [totalProducts, totalUsers, totalOrders, productAnalytics, userAnalytics, orderAnalytics, performanceMetrics] = await Promise.all([
            Product_1.Product.countDocuments({ isVisible: true }),
            User_1.User.countDocuments({ isActive: true }),
            Order_1.Order.countDocuments(),
            eventService_1.eventService.getAnalytics("product", "daily"),
            eventService_1.eventService.getAnalytics("user", "daily"),
            eventService_1.eventService.getAnalytics("order", "daily"),
            performance_1.performanceMonitor.getMetrics()
        ]);
        analytics = {
            overview: {
                totalProducts,
                totalUsers,
                totalOrders,
                timestamp: new Date()
            },
            events: {
                products: productAnalytics,
                users: userAnalytics,
                orders: orderAnalytics
            },
            performance: performanceMetrics
        };
        // Cache for 5 minutes
        await cacheService_1.cacheService.set("analytics", cacheKey, analytics);
    }
    res.json(new apiResponse_1.ApiResponse(true, "Dashboard analytics retrieved successfully", analytics));
});
/**
 * Get product analytics
 */
exports.getProductAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { productId } = req.params;
    const { period = "daily" } = req.query;
    const [productStats, eventAnalytics, recentEvents] = await Promise.all([
        Product_1.Product.findById(productId).select("name views purchases rating reviewCount"),
        eventService_1.eventService.getProductAnalytics(productId),
        eventService_1.eventService.getRecentEvents("anonymous", "product", 50)
    ]);
    if (!productStats) {
        return res.status(404).json(new apiResponse_1.ApiResponse(false, "Product not found"));
    }
    const analytics = {
        product: productStats,
        events: eventAnalytics,
        recentActivity: recentEvents.filter((e) => e.productId === productId),
        trends: await eventService_1.eventService.getAnalytics("product", period)
    };
    res.json(new apiResponse_1.ApiResponse(true, "Product analytics retrieved successfully", analytics));
});
/**
 * Get user behavior analytics
 */
exports.getUserAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    const [userStats, recentEvents, userTrends] = await Promise.all([
        User_1.User.findById(userId).select("firstName lastName email createdAt lastLogin orderCount totalSpent"),
        eventService_1.eventService.getRecentEvents(userId, undefined, Number(limit)),
        eventService_1.eventService.getAnalytics("user", "daily")
    ]);
    if (!userStats) {
        return res.status(404).json(new apiResponse_1.ApiResponse(false, "User not found"));
    }
    const analytics = {
        user: userStats,
        recentActivity: recentEvents,
        trends: userTrends,
        summary: {
            totalEvents: recentEvents.length,
            productViews: recentEvents.filter((e) => e.type === "product" && e.action === "view").length,
            cartActions: recentEvents.filter((e) => e.type === "product" && ["add_to_cart", "remove_from_cart"].includes(e.action)).length,
            purchases: recentEvents.filter((e) => e.type === "product" && e.action === "purchase").length
        }
    };
    res.json(new apiResponse_1.ApiResponse(true, "User analytics retrieved successfully", analytics));
});
/**
 * Get real-time analytics
 */
exports.getRealTimeAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type = "all" } = req.query;
    const analytics = await Promise.all([
        eventService_1.eventService.getAnalytics("product", "hourly"),
        eventService_1.eventService.getAnalytics("user", "hourly"),
        eventService_1.eventService.getAnalytics("order", "hourly"),
        performance_1.performanceMonitor.getMetrics()
    ]);
    const realTimeData = {
        hourlyEvents: {
            products: analytics[0],
            users: analytics[1],
            orders: analytics[2]
        },
        performance: analytics[3],
        timestamp: new Date()
    };
    res.json(new apiResponse_1.ApiResponse(true, "Real-time analytics retrieved successfully", realTimeData));
});
/**
 * Get performance analytics
 */
exports.getPerformanceAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { timeframe = "24h" } = req.query;
    const metrics = performance_1.performanceMonitor.getMetrics();
    const cacheStats = cacheService_1.cacheService.getStats();
    const performanceData = {
        metrics,
        cache: {
            stats: Object.fromEntries(cacheStats),
            memory: cacheService_1.cacheService.getMemoryStats()
        },
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        timeframe,
        timestamp: new Date()
    };
    res.json(new apiResponse_1.ApiResponse(true, "Performance analytics retrieved successfully", performanceData));
});
/**
 * Get top products analytics
 */
exports.getTopProducts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 10, sortBy = "views" } = req.query;
    const sortOptions = {
        views: { views: -1 },
        purchases: { purchases: -1 },
        rating: { rating: -1 },
        revenue: { totalRevenue: -1 }
    };
    const products = await Product_1.Product.find({ isVisible: true })
        .sort(sortOptions[sortBy] || sortOptions.views)
        .limit(Number(limit))
        .select("name price views purchases rating reviewCount totalRevenue images")
        .lean();
    // Get event analytics for each product
    const productsWithAnalytics = await Promise.all(products.map(async (product) => {
        const analytics = await eventService_1.eventService.getProductAnalytics(product._id.toString());
        return {
            ...product,
            analytics
        };
    }));
    res.json(new apiResponse_1.ApiResponse(true, "Top products retrieved successfully", {
        products: productsWithAnalytics,
        sortBy,
        limit: Number(limit)
    }));
});
/**
 * Get conversion funnel analytics
 */
exports.getConversionFunnel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { period = "daily" } = req.query;
    // Get analytics for different stages of the funnel
    const [productViews, cartAdds, checkouts, purchases] = await Promise.all([
        eventService_1.eventService.getAnalytics("product", period),
        // You would need to implement these specific event types
        eventService_1.eventService.getAnalytics("cart", period),
        eventService_1.eventService.getAnalytics("checkout", period),
        eventService_1.eventService.getAnalytics("order", period)
    ]);
    // Calculate conversion rates
    const totalViews = Object.values(productViews).reduce((sum, count) => sum + count, 0);
    const totalCartAdds = Object.values(cartAdds).reduce((sum, count) => sum + count, 0);
    const totalCheckouts = Object.values(checkouts).reduce((sum, count) => sum + count, 0);
    const totalPurchases = Object.values(purchases).reduce((sum, count) => sum + count, 0);
    const funnel = {
        stages: {
            views: totalViews,
            cartAdds: totalCartAdds,
            checkouts: totalCheckouts,
            purchases: totalPurchases
        },
        conversionRates: {
            viewToCart: totalViews > 0 ? ((totalCartAdds / totalViews) * 100).toFixed(2) : 0,
            cartToCheckout: totalCartAdds > 0 ? ((totalCheckouts / totalCartAdds) * 100).toFixed(2) : 0,
            checkoutToPurchase: totalCheckouts > 0 ? ((totalPurchases / totalCheckouts) * 100).toFixed(2) : 0,
            overall: totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(2) : 0
        },
        period,
        timestamp: new Date()
    };
    res.json(new apiResponse_1.ApiResponse(true, "Conversion funnel analytics retrieved successfully", funnel));
});
/**
 * Export analytics data
 */
exports.exportAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type, format = "json", startDate, endDate } = req.query;
    // This is a simplified export - in production you'd want more sophisticated filtering
    const analytics = await Promise.all([
        eventService_1.eventService.getAnalytics("product", "daily"),
        eventService_1.eventService.getAnalytics("user", "daily"),
        eventService_1.eventService.getAnalytics("order", "daily"),
        performance_1.performanceMonitor.getMetrics()
    ]);
    const exportData = {
        events: {
            products: analytics[0],
            users: analytics[1],
            orders: analytics[2]
        },
        performance: analytics[3],
        exportedAt: new Date(),
        filters: {
            type,
            startDate,
            endDate
        }
    };
    if (format === "csv") {
        // Convert to CSV format
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
        // Simple CSV conversion (you'd want a proper CSV library in production)
        const csv = Object.entries(exportData.events.products)
            .map(([date, count]) => `${date},${count}`)
            .join("\n");
        res.send(`Date,Count\n${csv}`);
    }
    else {
        res.json(new apiResponse_1.ApiResponse(true, "Analytics data exported successfully", exportData));
    }
});
/**
 * Clear analytics cache (admin only)
 */
exports.clearAnalyticsCache = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await Promise.all([cacheService_1.cacheService.invalidatePattern("analytics", "*"), eventService_1.eventService.clearAnalytics()]);
    res.json(new apiResponse_1.ApiResponse(true, "Analytics cache cleared successfully"));
});
