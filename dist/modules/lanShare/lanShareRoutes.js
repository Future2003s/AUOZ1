"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lanShareRouter = exports.lanUploadDir = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const logger_1 = require("../../utils/logger");
// ===== LAN Share Configuration =====
const LAN_PIN = process.env.LAN_PIN || "";
const UPLOAD_DIR_ENV = process.env.UPLOAD_DIR || process.env.LAN_UPLOAD_DIR;
const DEFAULT_UPLOAD_DIR = path_1.default.join(process.cwd(), "uploads", "lan-share");
exports.lanUploadDir = path_1.default.resolve(UPLOAD_DIR_ENV || DEFAULT_UPLOAD_DIR);
// Ensure upload directory exists
if (!fs_1.default.existsSync(exports.lanUploadDir)) {
    fs_1.default.mkdirSync(exports.lanUploadDir, { recursive: true });
    logger_1.logger.info(`[LAN SHARE] Created upload directory at: ${exports.lanUploadDir}`);
}
// ===== Helpers =====
const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"] || "";
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return req.socket.remoteAddress || "";
};
const isPinValid = (req) => {
    if (!LAN_PIN)
        return true; // PIN not required
    const headerPin = req.headers["x-pin"] || "";
    const queryPin = req.query.pin || "";
    return headerPin === LAN_PIN || queryPin === LAN_PIN;
};
const requirePinIfSet = (req, res, next) => {
    if (!LAN_PIN)
        return next();
    if (isPinValid(req))
        return next();
    logger_1.logger.warn(`[LAN SHARE] Invalid PIN from ${getClientIp(req)}`);
    res.status(401).json({ message: "Invalid PIN" });
};
const getUniqueFilename = (dir, originalName) => {
    const ext = path_1.default.extname(originalName);
    const base = path_1.default.basename(originalName, ext);
    let candidate = originalName;
    let counter = 1;
    while (fs_1.default.existsSync(path_1.default.join(dir, candidate))) {
        candidate = `${base} (${counter})${ext}`;
        counter += 1;
    }
    return candidate;
};
const ensureWithinDir = (dir, targetPath) => {
    const resolved = path_1.default.resolve(dir, targetPath);
    if (!resolved.startsWith(dir)) {
        throw new Error("Invalid path");
    }
    return resolved;
};
// ===== Multer Disk Storage for LAN Share =====
// Giới hạn mặc định: 1GB/file, có thể override qua LAN_MAX_FILE_SIZE (đơn vị: byte)
const maxUploadSizeBytes = parseInt(process.env.LAN_MAX_FILE_SIZE || `${1024 * 1024 * 1024}`, 10);
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, exports.lanUploadDir);
    },
    filename: (_req, file, cb) => {
        const safeOriginalName = file.originalname.replace(/[/\\]/g, "_");
        const unique = getUniqueFilename(exports.lanUploadDir, safeOriginalName);
        cb(null, unique);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: maxUploadSizeBytes
    }
}).array("files");
const sseClients = new Set();
let nextClientId = 1;
const broadcast = (event, data) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        try {
            client.res.write(payload);
        }
        catch (err) {
            logger_1.logger.warn(`[LAN SHARE] Failed to write to SSE client ${client.id}:`, err);
        }
    }
};
// Keep-alive ping every 25s to prevent iOS/router dropping the connection
const PING_INTERVAL_MS = 25_000;
setInterval(() => {
    if (sseClients.size === 0)
        return;
    const payload = `event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`;
    for (const client of sseClients) {
        try {
            client.res.write(payload);
        }
        catch (err) {
            logger_1.logger.warn("[LAN SHARE] Failed to write ping to SSE client:", err);
        }
    }
}, PING_INTERVAL_MS).unref();
// ===== Router =====
exports.lanShareRouter = (0, express_1.Router)();
// List files
exports.lanShareRouter.get("/files", requirePinIfSet, (_req, res) => {
    try {
        const entries = fs_1.default.readdirSync(exports.lanUploadDir, { withFileTypes: true });
        const files = entries
            .filter((e) => e.isFile())
            .map((entry) => {
            const fullPath = path_1.default.join(exports.lanUploadDir, entry.name);
            const stat = fs_1.default.statSync(fullPath);
            return {
                name: entry.name,
                size: stat.size,
                mtimeMs: stat.mtimeMs
            };
        })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
        res.json({ files });
    }
    catch (err) {
        logger_1.logger.error("[LAN SHARE] Failed to list files:", err);
        res.status(500).json({ message: "Failed to list files" });
    }
});
// Upload files (multipart)
exports.lanShareRouter.post("/upload", requirePinIfSet, (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            logger_1.logger.error("[LAN SHARE] Upload error:", err);
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({ message: "File too large" });
            }
            return res.status(400).json({ message: "Upload failed" });
        }
        const files = req.files || [];
        const uploaded = files.map((f) => ({
            name: f.filename,
            size: f.size
        }));
        logger_1.logger.info(`[LAN SHARE] Uploaded ${uploaded.length} file(s) from ${getClientIp(req)}`);
        // Broadcast change event
        if (uploaded.length > 0) {
            broadcast("changed", {
                type: "upload",
                uploaded
            });
        }
        res.json({ success: true, uploaded });
    });
});
// Delete file
exports.lanShareRouter.delete("/files/:name", requirePinIfSet, (req, res) => {
    const { name } = req.params;
    try {
        const safePath = ensureWithinDir(exports.lanUploadDir, name);
        if (!fs_1.default.existsSync(safePath)) {
            return res.status(404).json({ message: "File not found" });
        }
        fs_1.default.unlinkSync(safePath);
        logger_1.logger.info(`[LAN SHARE] Deleted file "${name}" from ${getClientIp(req)}`);
        // Broadcast delete event
        broadcast("changed", {
            type: "delete",
            name
        });
        res.json({ success: true });
    }
    catch (err) {
        logger_1.logger.error("[LAN SHARE] Failed to delete file:", err);
        res.status(500).json({ message: "Failed to delete file" });
    }
});
// Download file
exports.lanShareRouter.get("/download/:name", requirePinIfSet, (req, res) => {
    const { name } = req.params;
    try {
        const safePath = ensureWithinDir(exports.lanUploadDir, name);
        if (!fs_1.default.existsSync(safePath)) {
            return res.status(404).json({ message: "File not found" });
        }
        // Express handles proper headers; Unicode filenames work with modern browsers
        res.download(safePath, name, (err) => {
            if (err) {
                logger_1.logger.error("[LAN SHARE] Download error:", err);
                if (!res.headersSent) {
                    res.status(500).end();
                }
            }
        });
    }
    catch (err) {
        logger_1.logger.error("[LAN SHARE] Failed to download file:", err);
        res.status(500).json({ message: "Failed to download file" });
    }
});
// SSE events
exports.lanShareRouter.get("/events", (req, res) => {
    if (!isPinValid(req)) {
        logger_1.logger.warn(`[LAN SHARE] Invalid PIN for SSE from ${getClientIp(req)}`);
        return res.status(401).json({ message: "Invalid PIN" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // For some proxies
    res.flushHeaders?.();
    const id = nextClientId++;
    const client = { id, res };
    sseClients.add(client);
    logger_1.logger.info(`[LAN SHARE] SSE client connected (id=${id}) from ${getClientIp(req)}`);
    // Initial event
    res.write(`event: connected\ndata: ${JSON.stringify({ id, ts: Date.now() })}\n\n`);
    req.on("close", () => {
        sseClients.delete(client);
        logger_1.logger.info(`[LAN SHARE] SSE client disconnected (id=${id})`);
    });
});
