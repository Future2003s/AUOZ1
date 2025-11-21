"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = void 0;
const logger_1 = require("./logger");
const performance_1 = require("./performance");
const cacheService_1 = require("../services/cacheService");
const eventService_1 = require("../services/eventService");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Advanced Monitoring System for ShopDev
 * Real-time monitoring with alerts and health checks
 */
class MonitoringService {
    alerts = new Map();
    healthChecks = new Map();
    monitoringInterval = null;
    constructor() {
        this.setupHealthChecks();
        this.startMonitoring();
    }
    /**
     * Setup health checks for different services
     */
    setupHealthChecks() {
        // Database health check
        this.healthChecks.set("database", async () => {
            try {
                return mongoose_1.default.connection.readyState === 1;
            }
            catch {
                return false;
            }
        });
        // Cache health check
        this.healthChecks.set("cache", async () => {
            try {
                return true; // Simplified check
            }
            catch {
                return false;
            }
        });
        // Memory health check
        this.healthChecks.set("memory", async () => {
            try {
                const memUsage = process.memoryUsage();
                const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
                return heapUsedMB < 1024; // Alert if using more than 1GB
            }
            catch {
                return false;
            }
        });
        // Response time health check
        this.healthChecks.set("response_time", async () => {
            try {
                const metrics = performance_1.performanceMonitor.getMetrics();
                return metrics.averageResponseTime < 1000; // Alert if avg response > 1s
            }
            catch {
                return false;
            }
        });
    }
    /**
     * Start monitoring loop
     */
    startMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            await this.runHealthChecks();
            await this.checkPerformanceThresholds();
            await this.logSystemStats();
        }, 30000); // Check every 30 seconds
    }
    /**
     * Run all health checks
     */
    async runHealthChecks() {
        for (const [name, check] of this.healthChecks) {
            try {
                const isHealthy = await check();
                if (!isHealthy) {
                    await this.triggerAlert(name, `Health check failed: ${name}`);
                }
                else {
                    // Clear alert if it exists
                    this.clearAlert(name);
                }
            }
            catch (error) {
                logger_1.logger.error(`Health check error for ${name}:`, error);
                await this.triggerAlert(name, `Health check error: ${name} - ${error}`);
            }
        }
    }
    /**
     * Check performance thresholds
     */
    async checkPerformanceThresholds() {
        try {
            const metrics = performance_1.performanceMonitor.getMetrics();
            // Check error rate
            if (metrics.errorRate > 5) {
                // 5% error rate threshold
                await this.triggerAlert("error_rate", `High error rate: ${metrics.errorRate}%`);
            }
            // Check cache hit rate
            if (metrics.cacheHitRate < 70) {
                // 70% cache hit rate threshold
                await this.triggerAlert("cache_hit_rate", `Low cache hit rate: ${metrics.cacheHitRate}%`);
            }
            // Check request count spike
            if (metrics.requestCount > 10000) {
                // 10k requests threshold
                await this.triggerAlert("high_traffic", `High traffic detected: ${metrics.requestCount} requests`);
            }
        }
        catch (error) {
            logger_1.logger.error("Performance threshold check error:", error);
        }
    }
    /**
     * Log system statistics
     */
    async logSystemStats() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            const metrics = performance_1.performanceMonitor.getMetrics();
            const cacheStats = cacheService_1.cacheService.getStats();
            const stats = {
                timestamp: new Date().toISOString(),
                memory: {
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    external: Math.round(memUsage.external / 1024 / 1024), // MB
                    rss: Math.round(memUsage.rss / 1024 / 1024) // MB
                },
                cpu: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                performance: {
                    requestCount: metrics.requestCount,
                    averageResponseTime: Math.round(metrics.averageResponseTime),
                    errorRate: metrics.errorRate || 0,
                    cacheHitRate: metrics.cacheHitRate
                },
                cache: {
                    size: cacheStats.size,
                    hits: Array.from(cacheStats.values()).reduce((sum, stat) => sum + stat.hits, 0),
                    misses: Array.from(cacheStats.values()).reduce((sum, stat) => sum + stat.misses, 0)
                },
                database: {
                    readyState: mongoose_1.default.connection.readyState,
                    host: mongoose_1.default.connection.host
                }
            };
            // Cache stats for analytics
            await cacheService_1.cacheService.set("monitoring", "system_stats", stats);
            // Log to console in development
            if (process.env.NODE_ENV === "development") {
                logger_1.logger.debug("📊 System Stats:", stats);
            }
        }
        catch (error) {
            logger_1.logger.error("Error logging system stats:", error);
        }
    }
    /**
     * Trigger an alert
     */
    async triggerAlert(type, message) {
        const alertKey = `alert_${type}`;
        const existingAlert = this.alerts.get(alertKey);
        // Don't spam alerts - only trigger if not already active
        if (!existingAlert || Date.now() - existingAlert.timestamp > 300000) {
            // 5 minutes cooldown
            const alert = {
                type,
                message,
                timestamp: Date.now(),
                severity: this.getAlertSeverity(type)
            };
            this.alerts.set(alertKey, alert);
            // Log alert
            logger_1.logger.warn(`🚨 ALERT [${alert.severity}]: ${message}`);
            // Cache alert for dashboard
            await cacheService_1.cacheService.set("monitoring", alertKey, alert);
            // In production, you would send this to external monitoring services
            // like Slack, PagerDuty, email, etc.
        }
    }
    /**
     * Clear an alert
     */
    clearAlert(type) {
        const alertKey = `alert_${type}`;
        if (this.alerts.has(alertKey)) {
            this.alerts.delete(alertKey);
            logger_1.logger.info(`✅ Alert cleared: ${type}`);
        }
    }
    /**
     * Get alert severity level
     */
    getAlertSeverity(type) {
        const severityMap = {
            database: "critical",
            redis: "high",
            memory: "high",
            response_time: "medium",
            error_rate: "high",
            cache_hit_rate: "medium",
            high_traffic: "low"
        };
        return severityMap[type] || "medium";
    }
    /**
     * Get current system health
     */
    async getSystemHealth() {
        const health = {
            status: "healthy",
            checks: {},
            alerts: Array.from(this.alerts.values()),
            timestamp: new Date().toISOString()
        };
        // Run health checks
        for (const [name, check] of this.healthChecks) {
            try {
                health.checks[name] = await check();
            }
            catch {
                health.checks[name] = false;
            }
        }
        // Determine overall status
        const failedChecks = Object.values(health.checks).filter((check) => !check);
        const criticalAlerts = health.alerts.filter((alert) => alert.severity === "critical");
        const highAlerts = health.alerts.filter((alert) => alert.severity === "high");
        if (criticalAlerts.length > 0 || failedChecks.length > 2) {
            health.status = "critical";
        }
        else if (highAlerts.length > 0 || failedChecks.length > 0) {
            health.status = "warning";
        }
        return health;
    }
    /**
     * Get monitoring dashboard data
     */
    async getDashboardData() {
        const [systemHealth, systemStats, recentEvents] = await Promise.all([
            this.getSystemHealth(),
            cacheService_1.cacheService.get("monitoring", "system_stats"),
            eventService_1.eventService.getRecentEvents("system", undefined, 20)
        ]);
        return {
            health: systemHealth,
            stats: systemStats,
            events: recentEvents,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Stop monitoring
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger_1.logger.info("Monitoring stopped");
        }
    }
}
exports.monitoringService = new MonitoringService();
