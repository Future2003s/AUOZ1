"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
/**
 * Standardized API Response class
 */
class ApiResponse {
    success;
    message;
    data;
    error;
    timestamp;
    constructor(success, message, data, error) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }
    /**
     * Create success response
     */
    static success(message, data) {
        return new ApiResponse(true, message, data);
    }
    /**
     * Create error response
     */
    static error(message, error) {
        return new ApiResponse(false, message, undefined, error);
    }
    /**
     * Create paginated response
     */
    static paginated(message, data, pagination) {
        return new ApiResponse(true, message, {
            ...data,
            pagination
        });
    }
}
exports.ApiResponse = ApiResponse;
