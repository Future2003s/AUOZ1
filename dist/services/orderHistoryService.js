"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderHistoryService = void 0;
// In-memory storage for demo purposes
// In real app, this would be a database table
const orderHistory = [];
exports.orderHistoryService = {
    // Add a new history entry
    addEntry: (entry) => {
        const newEntry = {
            ...entry,
            id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
        };
        orderHistory.push(newEntry);
        return newEntry;
    },
    // Get history for a specific order
    getOrderHistory: (orderId) => {
        return orderHistory.filter((entry) => entry.orderId === orderId);
    },
    // Get all history (for admin)
    getAllHistory: () => {
        return [...orderHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    // Clear history (for testing)
    clearHistory: () => {
        orderHistory.length = 0;
    }
};
