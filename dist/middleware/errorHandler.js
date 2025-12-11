"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const AppError_1 = require("../utils/AppError");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const errorHandler = (error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;
    // Log error
    logger_1.logger.error(`Error: ${error.message}`, {
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent")
    });
    // Mongoose bad ObjectId
    if (error.name === "CastError") {
        const message = "Resource not found";
        err = new AppError_1.AppError(message, 404);
    }
    // Mongoose duplicate key
    if (error.code === 11000) {
        const message = "Duplicate field value entered";
        err = new AppError_1.AppError(message, 400);
    }
    // Mongoose validation error
    if (error.name === "ValidationError") {
        const message = Object.values(error.errors)
            .map((val) => val.message)
            .join(", ");
        err = new AppError_1.AppError(message, 400);
    }
    // JWT errors
    if (error.name === "JsonWebTokenError") {
        const message = "Invalid token";
        err = new AppError_1.AppError(message, 401);
    }
    if (error.name === "TokenExpiredError") {
        const message = "Token expired";
        err = new AppError_1.AppError(message, 401);
    }
    // bcrypt errors (password comparison issues)
    if (error.message && error.message.includes("Illegal arguments")) {
        const message = "Authentication failed - invalid credentials";
        err = new AppError_1.AppError(message, 401);
        logger_1.logger.error("bcrypt error detected - likely missing password field in user object");
    }
    // Check if request is for API endpoint
    if (req.originalUrl.startsWith("/api/")) {
        // Send JSON error response for API endpoints
        const response = {
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
    const htmlErrorPath = path_1.default.join(__dirname, `../views/${statusCode}.html`);
    // Try to serve specific error page (404.html, 500.html, etc.)
    if (fs_1.default.existsSync(htmlErrorPath)) {
        const htmlError = fs_1.default.readFileSync(htmlErrorPath, "utf8");
        return res.status(statusCode).type("html").send(htmlError);
    }
    // Fallback to generic error page
    const fallbackHtmlPath = path_1.default.join(__dirname, "../views/500.html");
    if (fs_1.default.existsSync(fallbackHtmlPath)) {
        const fallbackHtml = fs_1.default.readFileSync(fallbackHtmlPath, "utf8");
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
exports.errorHandler = errorHandler;
