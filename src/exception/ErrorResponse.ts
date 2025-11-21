import { Response } from "express";

interface ErrorThrow {
    [key: string]: string;
}

export class ErrorHandler extends Error {
    status: number;
    error: string | ErrorThrow;
    constructor(status: number, error: string | ErrorThrow) {
        super();
        this.status = status;
        this.error = error;
    }
}

export const responseError = (res: Response, error: ErrorHandler | any) => {
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
