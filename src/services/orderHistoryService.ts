interface OrderHistoryEntry {
    id: string;
    orderId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    note?: string;
    createdAt: string;
}

// In-memory storage for demo purposes
// In real app, this would be a database table
const orderHistory: OrderHistoryEntry[] = [];

export const orderHistoryService = {
    // Add a new history entry
    addEntry: (entry: Omit<OrderHistoryEntry, "id" | "createdAt">): OrderHistoryEntry => {
        const newEntry: OrderHistoryEntry = {
            ...entry,
            id: `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
        };

        orderHistory.push(newEntry);
        return newEntry;
    },

    // Get history for a specific order
    getOrderHistory: (orderId: string): OrderHistoryEntry[] => {
        return orderHistory.filter((entry) => entry.orderId === orderId);
    },

    // Get all history (for admin)
    getAllHistory: (): OrderHistoryEntry[] => {
        return [...orderHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    // Clear history (for testing)
    clearHistory: (): void => {
        orderHistory.length = 0;
    }
};
