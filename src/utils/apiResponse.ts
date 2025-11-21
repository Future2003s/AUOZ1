/**
 * Standardized API Response class
 */
export class ApiResponse {
    public success: boolean;
    public message: string;
    public data?: any;
    public error?: any;
    public timestamp: string;

    constructor(success: boolean, message: string, data?: any, error?: any) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Create success response
     */
    static success(message: string, data?: any): ApiResponse {
        return new ApiResponse(true, message, data);
    }

    /**
     * Create error response
     */
    static error(message: string, error?: any): ApiResponse {
        return new ApiResponse(false, message, undefined, error);
    }

    /**
     * Create paginated response
     */
    static paginated(message: string, data: any, pagination: any): ApiResponse {
        return new ApiResponse(true, message, {
            ...data,
            pagination
        });
    }
}
