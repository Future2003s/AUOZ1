"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHandler = void 0;
const fastJsonService_1 = require("../services/fastJsonService");
const logger_1 = require("./logger");
class ResponseHandler {
    static success(res, data = null, message = "Success", statusCode = 200, schemaName = "apiResponse") {
        const response = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        // Use fast JSON stringify for better performance
        try {
            const jsonString = fastJsonService_1.fastJsonService.stringify(schemaName, response);
            return res.status(statusCode).type("application/json").send(jsonString);
        }
        catch (error) {
            logger_1.logger.warn(`FastJSON failed for schema ${schemaName}, falling back to regular JSON:`, error);
            return res.status(statusCode).json(response);
        }
    }
    static error(res, message = "Error", statusCode = 500, data = null) {
        const response = {
            success: false,
            message,
            ...(data && { data })
        };
        return res.status(statusCode).json(response);
    }
    static paginated(res, data, page, limit, total, message = "Success") {
        const response = {
            success: true,
            message,
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
        return res.status(200).json(response);
    }
    static created(res, data = null, message = "Created successfully", schemaName = "apiResponse") {
        return this.success(res, data, message, 201, schemaName);
    }
    static authSuccess(res, data = null, message = "Success", statusCode = 200) {
        return this.success(res, data, message, statusCode, "authResponse");
    }
    static authCreated(res, data = null, message = "Created successfully") {
        return this.success(res, data, message, 201, "authResponse");
    }
    static updated(res, data = null, message = "Updated successfully") {
        return this.success(res, data, message, 200);
    }
    static deleted(res, message = "Deleted successfully") {
        return this.success(res, null, message, 200);
    }
    static notFound(res, message = "Resource not found") {
        return this.error(res, message, 404);
    }
    static unauthorized(res, message = "Unauthorized") {
        return this.error(res, message, 401);
    }
    static forbidden(res, message = "Forbidden") {
        return this.error(res, message, 403);
    }
    static badRequest(res, message = "Bad request", data = null) {
        return this.error(res, message, 400, data);
    }
}
exports.ResponseHandler = ResponseHandler;
