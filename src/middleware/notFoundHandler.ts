import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import path from "path";
import fs from "fs";

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): any => {
    // Check if request is for API endpoint
    if (req.originalUrl.startsWith("/api/")) {
        const error = new AppError(`API endpoint ${req.originalUrl} not found`, 404);
        return next(error);
    }

    // For non-API routes, serve HTML 404 page
    const html404Path = path.join(__dirname, "../views/404.html");

    if (fs.existsSync(html404Path)) {
        const html404 = fs.readFileSync(html404Path, "utf8");
        return res.status(404).type("html").send(html404);
    }

    // Fallback if HTML file doesn't exist
    res.status(404).type("html").send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Page Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #333; }
                p { color: #666; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">← Back to Home</a>
        </body>
        </html>
    `);
};
