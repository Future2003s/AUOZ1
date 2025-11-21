import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { AppError } from "../utils/AppError";
import path from "path";
import fs from "fs";

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction): any => {
    let err = { ...error };
    err.message = error.message;

    // Log error
    logger.error(`Error: ${error.message}`, {
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent")
    });

    // Mongoose bad ObjectId
    if (error.name === "CastError") {
        const message = "Resource not found";
        err = new AppError(message, 404);
    }

    // Mongoose duplicate key
    if (error.code === 11000) {
        const message = "Duplicate field value entered";
        err = new AppError(message, 400);
    }

    // Mongoose validation error
    if (error.name === "ValidationError") {
        const message = Object.values(error.errors)
            .map((val: any) => val.message)
            .join(", ");
        err = new AppError(message, 400);
    }

    // JWT errors
    if (error.name === "JsonWebTokenError") {
        const message = "Invalid token";
        err = new AppError(message, 401);
    }

    if (error.name === "TokenExpiredError") {
        const message = "Token expired";
        err = new AppError(message, 401);
    }

    // bcrypt errors (password comparison issues)
    if (error.message && error.message.includes("Illegal arguments")) {
        const message = "Authentication failed - invalid credentials";
        err = new AppError(message, 401);
        logger.error("bcrypt error detected - likely missing password field in user object");
    }

    // Check if request is for API endpoint
    if (req.originalUrl.startsWith("/api/")) {
        // Send JSON error response for API endpoints
        const response: any = {
            success: false,
            error: err.message || "Server Error"
        };

        // Only include stack trace in development
        if (process.env.NODE_ENV === "development") {
            response.stack = error.stack;
        }

        return res.status(err.statusCode || 500).json(response);
    }

    // For non-API routes, serve HTML error page
    const statusCode = err.statusCode || 500;
    const htmlErrorPath = path.join(__dirname, `../views/${statusCode}.html`);

    // Try to serve specific error page (404.html, 500.html, etc.)
    if (fs.existsSync(htmlErrorPath)) {
        const htmlError = fs.readFileSync(htmlErrorPath, "utf8");
        return res.status(statusCode).type("html").send(htmlError);
    }

    // Fallback to generic error page
    const fallbackHtmlPath = path.join(__dirname, "../views/500.html");
    if (fs.existsSync(fallbackHtmlPath)) {
        const fallbackHtml = fs.readFileSync(fallbackHtmlPath, "utf8");
        return res.status(statusCode).type("html").send(fallbackHtml);
    }

    // Final fallback if no HTML files exist
    res.status(statusCode).type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Error ${statusCode}</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #333; }
                p { color: #666; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>Error ${statusCode}</h1>
            <p>${err.message || "Something went wrong"}</p>
            <a href="/">← Back to Home</a>
        </body>
        </html>
    `);
};
