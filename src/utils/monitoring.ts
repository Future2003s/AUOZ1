import { logger } from "./logger";
import { performanceMonitor } from "./performance";
import { cacheService } from "../services/cacheService";
import { eventService } from "../services/eventService";
import mongoose from "mongoose";

/**
 * Advanced Monitoring System for ShopDev
 * Real-time monitoring with alerts and health checks
 */
class MonitoringService {
    private alerts: Map<string, any> = new Map();
    private healthChecks: Map<string, () => Promise<boolean>> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.setupHealthChecks();
        this.startMonitoring();
    }

    /**
     * Setup health checks for different services
     */
    private setupHealthChecks(): void {
        // Database health check
        this.healthChecks.set("database", async () => {
            try {
                return mongoose.connection.readyState === 1;
            } catch {
                return false;
            }
        });

        // Cache health check
        this.healthChecks.set("cache", async () => {
            try {
                return true; // Simplified check
            } catch {
                return false;
            }
        });

        // Memory health check
        this.healthChecks.set("memory", async () => {
            try {
                const memUsage = process.memoryUsage();
                const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
                return heapUsedMB < 1024; // Alert if using more than 1GB
            } catch {
                return false;
            }
        });

        // Response time health check
        this.healthChecks.set("response_time", async () => {
            try {
                const metrics = performanceMonitor.getMetrics();
                return metrics.averageResponseTime < 1000; // Alert if avg response > 1s
            } catch {
                return false;
            }
        });
    }

    /**
     * Start monitoring loop
     */
    private startMonitoring(): void {
        this.monitoringInterval = setInterval(async () => {
            await this.runHealthChecks();
            await this.checkPerformanceThresholds();
            await this.logSystemStats();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Run all health checks
     */
    private async runHealthChecks(): Promise<void> {
        for (const [name, check] of this.healthChecks) {
            try {
                const isHealthy = await check();

                if (!isHealthy) {
                    await this.triggerAlert(name, `Health check failed: ${name}`);
                } else {
                    // Clear alert if it exists
                    this.clearAlert(name);
                }
            } catch (error) {
                logger.error(`Health check error for ${name}:`, error);
                await this.triggerAlert(name, `Health check error: ${name} - ${error}`);
            }
        }
    }

    /**
     * Check performance thresholds
     */
    private async checkPerformanceThresholds(): Promise<void> {
        try {
            const metrics = performanceMonitor.getMetrics();

            // Check error rate
            if ((metrics as any).errorRate > 5) {
                // 5% error rate threshold
                await this.triggerAlert("error_rate", `High error rate: ${(metrics as any).errorRate}%`);
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
        } catch (error) {
            logger.error("Performance threshold check error:", error);
        }
    }

    /**
     * Log system statistics
     */
    private async logSystemStats(): Promise<void> {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            const metrics = performanceMonitor.getMetrics();
            const cacheStats = cacheService.getStats();

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
                    errorRate: (metrics as any).errorRate || 0,
                    cacheHitRate: metrics.cacheHitRate
                },
                cache: {
                    size: cacheStats.size,
                    hits: Array.from(cacheStats.values()).reduce((sum, stat) => sum + stat.hits, 0),
                    misses: Array.from(cacheStats.values()).reduce((sum, stat) => sum + stat.misses, 0)
                },
                database: {
                    readyState: mongoose.connection.readyState,
                    host: mongoose.connection.host
                }
            };

            // Cache stats for analytics
            await cacheService.set("monitoring", "system_stats", stats);

            // Log to console in development
            if (process.env.NODE_ENV === "development") {
                logger.debug("📊 System Stats:", stats);
            }
        } catch (error) {
            logger.error("Error logging system stats:", error);
        }
    }

    /**
     * Trigger an alert
     */
    private async triggerAlert(type: string, message: string): Promise<void> {
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
            logger.warn(`🚨 ALERT [${alert.severity}]: ${message}`);

            // Cache alert for dashboard
            await cacheService.set("monitoring", alertKey, alert);

            // In production, you would send this to external monitoring services
            // like Slack, PagerDuty, email, etc.
        }
    }

    /**
     * Clear an alert
     */
    private clearAlert(type: string): void {
        const alertKey = `alert_${type}`;
        if (this.alerts.has(alertKey)) {
            this.alerts.delete(alertKey);
            logger.info(`✅ Alert cleared: ${type}`);
        }
    }

    /**
     * Get alert severity level
     */
    private getAlertSeverity(type: string): "low" | "medium" | "high" | "critical" {
        const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
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
    async getSystemHealth(): Promise<any> {
        const health = {
            status: "healthy" as "healthy" | "warning" | "critical",
            checks: {} as Record<string, boolean>,
            alerts: Array.from(this.alerts.values()),
            timestamp: new Date().toISOString()
        };

        // Run health checks
        for (const [name, check] of this.healthChecks) {
            try {
                health.checks[name] = await check();
            } catch {
                health.checks[name] = false;
            }
        }

        // Determine overall status
        const failedChecks = Object.values(health.checks).filter((check) => !check);
        const criticalAlerts = health.alerts.filter((alert) => alert.severity === "critical");
        const highAlerts = health.alerts.filter((alert) => alert.severity === "high");

        if (criticalAlerts.length > 0 || failedChecks.length > 2) {
            health.status = "critical";
        } else if (highAlerts.length > 0 || failedChecks.length > 0) {
            health.status = "warning";
        }

        return health;
    }

    /**
     * Get monitoring dashboard data
     */
    async getDashboardData(): Promise<any> {
        const [systemHealth, systemStats, recentEvents] = await Promise.all([
            this.getSystemHealth(),
            cacheService.get("monitoring", "system_stats"),
            eventService.getRecentEvents("system", undefined, 20)
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
    stop(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info("Monitoring stopped");
        }
    }
}

export const monitoringService = new MonitoringService();
