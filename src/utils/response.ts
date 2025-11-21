import { Response } from "express";
import { fastJsonService } from "../services/fastJsonService";
import { logger } from "./logger";

interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
    timestamp?: string;
}

export class ResponseHandler {
    static success(
        res: Response,
        data: any = null,
        message: string = "Success",
        statusCode: number = 200,
        schemaName: string = "apiResponse"
    ): Response {
        const response: ApiResponse = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        // Use fast JSON stringify for better performance
        try {
            const jsonString = fastJsonService.stringify(schemaName, response);
            return res.status(statusCode).type("application/json").send(jsonString);
        } catch (error) {
            logger.warn(`FastJSON failed for schema ${schemaName}, falling back to regular JSON:`, error);
            return res.status(statusCode).json(response);
        }
    }

    static error(res: Response, message: string = "Error", statusCode: number = 500, data: any = null): Response {
        const response: ApiResponse = {
            success: false,
            message,
            ...(data && { data })
        };

        return res.status(statusCode).json(response);
    }

    static paginated(
        res: Response,
        data: any[],
        page: number,
        limit: number,
        total: number,
        message: string = "Success"
    ): Response {
        const response: ApiResponse = {
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

    static created(
        res: Response,
        data: any = null,
        message: string = "Created successfully",
        schemaName: string = "apiResponse"
    ): Response {
        return this.success(res, data, message, 201, schemaName);
    }

    static authSuccess(
        res: Response,
        data: any = null,
        message: string = "Success",
        statusCode: number = 200
    ): Response {
        return this.success(res, data, message, statusCode, "authResponse");
    }

    static authCreated(res: Response, data: any = null, message: string = "Created successfully"): Response {
        return this.success(res, data, message, 201, "authResponse");
    }

    static updated(res: Response, data: any = null, message: string = "Updated successfully"): Response {
        return this.success(res, data, message, 200);
    }

    static deleted(res: Response, message: string = "Deleted successfully"): Response {
        return this.success(res, null, message, 200);
    }

    static notFound(res: Response, message: string = "Resource not found"): Response {
        return this.error(res, message, 404);
    }

    static unauthorized(res: Response, message: string = "Unauthorized"): Response {
        return this.error(res, message, 401);
    }

    static forbidden(res: Response, message: string = "Forbidden"): Response {
        return this.error(res, message, 403);
    }

    static badRequest(res: Response, message: string = "Bad request", data: any = null): Response {
        return this.error(res, message, 400, data);
    }
}
