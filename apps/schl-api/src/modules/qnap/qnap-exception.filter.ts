import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QnapApiError } from './qnap.types';

@Catch(QnapApiError)
export class QnapExceptionFilter implements ExceptionFilter {
    catch(exception: QnapApiError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;

        // Map QNAP status codes to HTTP status codes
        switch (exception.status) {
            case 2: // File or folder already exists
                status = HttpStatus.CONFLICT;
                break;
            case 3: // Session expired
            case 17: // Authentication failed
                status = HttpStatus.UNAUTHORIZED;
                break;
            case 4: // Permission denied
            case 18: // Account locked
            case 25: // File is locked
                status = HttpStatus.FORBIDDEN;
                break;
            case 5: // File or folder not found
                status = HttpStatus.NOT_FOUND;
                break;
            case 101: // Invalid parameter
            case 102: // Missing parameter
                status = HttpStatus.BAD_REQUEST;
                break;
            default:
                status = HttpStatus.BAD_REQUEST; // Default to 400 for other API errors
        }

        // Network errors (status 0)
        if (exception.status === 0) {
            status = HttpStatus.BAD_GATEWAY;
        }

        response.status(status).json({
            statusCode: status,
            message: exception.message,
            qnapStatus: exception.status,
            context: exception.context,
            timestamp: new Date().toISOString(),
        });
    }
}
