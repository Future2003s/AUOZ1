"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseError = exports.ErrorHandler = void 0;
class ErrorHandler extends Error {
    status;
    error;
    constructor(status, error) {
        super();
        this.status = status;
        this.error = error;
    }
}
exports.ErrorHandler = ErrorHandler;
const responseError = (res, error) => {
    if (error instanceof ErrorHandler) {
        const status = error.status;
        // Case just string
        if (typeof error.error === "string") {
            const message = error.error;
            return res.status(status).send({ message });
        }
        // Case error is object
        const errorObject = error.error;
        return res.status(status).send(error.error);
    }
    return res.status(500).send({ message: error.message });
};
exports.responseError = responseError;
