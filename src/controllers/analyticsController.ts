import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { eventService } from "../services/eventService";
import { performanceMonitor } from "../utils/performance";
import { cacheService } from "../services/cacheService";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { Order } from "../models/Order";

/**
 * Analytics Controller for ShopDev
 * Provides comprehensive analytics and insights
 */

/**
 * Get dashboard analytics overview
 */
export const getDashboardAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const cacheKey = "dashboard_analytics";

    // Try cache first
    let analytics = await cacheService.get("analytics", cacheKey);

    if (!analytics) {
        // Calculate analytics
        const [
            totalProducts,
            totalUsers,
            totalOrders,
            productAnalytics,
            userAnalytics,
            orderAnalytics,
            performanceMetrics
        ] = await Promise.all([
            Product.countDocuments({ isVisible: true }),
            User.countDocuments({ isActive: true }),
            Order.countDocuments(),
            eventService.getAnalytics("product", "daily"),
            eventService.getAnalytics("user", "daily"),
            eventService.getAnalytics("order", "daily"),
            performanceMonitor.getMetrics()
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
        await cacheService.set("analytics", cacheKey, analytics);
    }

    res.json(new ApiResponse(true, "Dashboard analytics retrieved successfully", analytics));
});

/**
 * Get product analytics
 */
export const getProductAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { period = "daily" } = req.query;

    const [productStats, eventAnalytics, recentEvents] = await Promise.all([
        Product.findById(productId).select("name views purchases rating reviewCount"),
        eventService.getProductAnalytics(productId),
        eventService.getRecentEvents("anonymous", "product", 50)
    ]);

    if (!productStats) {
        return res.status(404).json(new ApiResponse(false, "Product not found"));
    }

    const analytics = {
        product: productStats,
        events: eventAnalytics,
        recentActivity: recentEvents.filter((e) => (e as any).productId === productId),
        trends: await eventService.getAnalytics("product", period as "daily" | "hourly")
    };

    res.json(new ApiResponse(true, "Product analytics retrieved successfully", analytics));
});

/**
 * Get user behavior analytics
 */
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const [userStats, recentEvents, userTrends] = await Promise.all([
        User.findById(userId).select("firstName lastName email createdAt lastLogin orderCount totalSpent"),
        eventService.getRecentEvents(userId, undefined, Number(limit)),
        eventService.getAnalytics("user", "daily")
    ]);

    if (!userStats) {
        return res.status(404).json(new ApiResponse(false, "User not found"));
    }

    const analytics = {
        user: userStats,
        recentActivity: recentEvents,
        trends: userTrends,
        summary: {
            totalEvents: recentEvents.length,
            productViews: recentEvents.filter((e) => e.type === "product" && (e as any).action === "view").length,
            cartActions: recentEvents.filter(
                (e) => e.type === "product" && ["add_to_cart", "remove_from_cart"].includes((e as any).action)
            ).length,
            purchases: recentEvents.filter((e) => e.type === "product" && (e as any).action === "purchase").length
        }
    };

    res.json(new ApiResponse(true, "User analytics retrieved successfully", analytics));
});

/**
 * Get real-time analytics
 */
export const getRealTimeAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { type = "all" } = req.query;

    const analytics = await Promise.all([
        eventService.getAnalytics("product", "hourly"),
        eventService.getAnalytics("user", "hourly"),
        eventService.getAnalytics("order", "hourly"),
        performanceMonitor.getMetrics()
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

    res.json(new ApiResponse(true, "Real-time analytics retrieved successfully", realTimeData));
});

/**
 * Get performance analytics
 */
export const getPerformanceAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { timeframe = "24h" } = req.query;

    const metrics = performanceMonitor.getMetrics();
    const cacheStats = cacheService.getStats();

    const performanceData = {
        metrics,
        cache: {
            stats: Object.fromEntries(cacheStats),
            memory: cacheService.getMemoryStats()
        },
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        timeframe,
        timestamp: new Date()
    };

    res.json(new ApiResponse(true, "Performance analytics retrieved successfully", performanceData));
});

/**
 * Get top products analytics
 */
export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, sortBy = "views" } = req.query;

    const sortOptions: Record<string, any> = {
        views: { views: -1 },
        purchases: { purchases: -1 },
        rating: { rating: -1 },
        revenue: { totalRevenue: -1 }
    };

    const products = await Product.find({ isVisible: true })
        .sort(sortOptions[sortBy as string] || sortOptions.views)
        .limit(Number(limit))
        .select("name price views purchases rating reviewCount totalRevenue images")
        .lean();

    // Get event analytics for each product
    const productsWithAnalytics = await Promise.all(
        products.map(async (product) => {
            const analytics = await eventService.getProductAnalytics(product._id.toString());
            return {
                ...product,
                analytics
            };
        })
    );

    res.json(
        new ApiResponse(true, "Top products retrieved successfully", {
            products: productsWithAnalytics,
            sortBy,
            limit: Number(limit)
        })
    );
});

/**
 * Get conversion funnel analytics
 */
export const getConversionFunnel = asyncHandler(async (req: Request, res: Response) => {
    const { period = "daily" } = req.query;

    // Get analytics for different stages of the funnel
    const [productViews, cartAdds, checkouts, purchases] = await Promise.all([
        eventService.getAnalytics("product", period as "daily" | "hourly"),
        // You would need to implement these specific event types
        eventService.getAnalytics("cart", period as "daily" | "hourly"),
        eventService.getAnalytics("checkout", period as "daily" | "hourly"),
        eventService.getAnalytics("order", period as "daily" | "hourly")
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

    res.json(new ApiResponse(true, "Conversion funnel analytics retrieved successfully", funnel));
});

/**
 * Export analytics data
 */
export const exportAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { type, format = "json", startDate, endDate } = req.query;

    // This is a simplified export - in production you'd want more sophisticated filtering
    const analytics = await Promise.all([
        eventService.getAnalytics("product", "daily"),
        eventService.getAnalytics("user", "daily"),
        eventService.getAnalytics("order", "daily"),
        performanceMonitor.getMetrics()
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
    } else {
        res.json(new ApiResponse(true, "Analytics data exported successfully", exportData));
    }
});

/**
 * Clear analytics cache (admin only)
 */
export const clearAnalyticsCache = asyncHandler(async (req: Request, res: Response) => {
    await Promise.all([cacheService.invalidatePattern("analytics", "*"), eventService.clearAnalytics()]);

    res.json(new ApiResponse(true, "Analytics cache cleared successfully"));
});
