import {
    BadRequestException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    getFtpConnection,
    PromiseFtp,
    releaseFtpConnection,
} from '@repo/schemas/lib/ftp';

interface FtpConfig extends PromiseFtp.Options {
    host: string;
    user: string;
    password: string;
    port: number;
}

@Injectable()
export class FtpService {
    private readonly ftpConfig: FtpConfig;

    constructor(private readonly configService: ConfigService) {
        this.ftpConfig = {
            host: this.configService.get<string>('FTP_HOST') || 'localhost',
            user: this.configService.get<string>('FTP_USER') || 'anonymous',
            password: this.configService.get<string>('FTP_PASSWORD') || 'guest',
            port: this.configService.get<number>('FTP_PORT') || 21,
        };
    }

    async deleteFile(fileName: string, folderName: string) {
        const ftpConnection = await getFtpConnection(this.ftpConfig);
        try {
            if (!ftpConnection) {
                throw new InternalServerErrorException(
                    'Failed to connect to FTP server',
                );
            }
            await ftpConnection.delete(`./${folderName}/${fileName}`);
            return 'File deleted successfully';
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to delete file');
        } finally {
            if (ftpConnection) {
                await releaseFtpConnection(ftpConnection);
            }
        }
    }

    async downloadFile(fileName: string, folderName: string) {
        const ftpConnection = await getFtpConnection(this.ftpConfig);
        try {
            if (!ftpConnection) {
                throw new InternalServerErrorException(
                    'Failed to connect to FTP server',
                );
            }
            const stream = await ftpConnection.get(
                `./${folderName}/${fileName}`,
            );
            if (!stream) {
                throw new NotFoundException('File not found');
            }

            if (!(stream instanceof (await import('stream')).Readable)) {
                throw new InternalServerErrorException('Invalid stream type');
            }

            return stream;
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to download file');
        } finally {
            if (ftpConnection) {
                await releaseFtpConnection(ftpConnection);
            }
        }
    }

    async uploadFile(buffer: Buffer, fileName: string, folderName: string) {
        // --- Folder sanitization ---
        const rawFolder = String(folderName);
        const sanitizedFolder = rawFolder
            .trim()
            .replace(/^\/+|\/+$|\\+$/g, '') // remove leading/trailing slashes or backslashes
            .replace(/\s+/g, '_'); // spaces to underscores

        if (!sanitizedFolder || /\.\./.test(sanitizedFolder)) {
            throw new BadRequestException('Invalid folderName');
        }

        // --- Filename sanitization ---
        const rawFile = String(fileName).trim();

        // Block path traversal, illegal characters, or blank filenames
        if (!rawFile || /\.\./.test(rawFile)) {
            throw new BadRequestException('Invalid fileName');
        }

        // Allow only alphanumerics, dots, underscores, hyphens, and single extensions
        // Examples of allowed: data.csv, image_1.png, report-final.pdf
        const sanitizedFile = rawFile.replace(/[^a-zA-Z0-9._-]/g, '_');

        const ftpConnection = await getFtpConnection(this.ftpConfig);
        try {
            if (!ftpConnection) {
                throw new InternalServerErrorException(
                    'Failed to connect to FTP server',
                );
            }

            const targetDir = `./${sanitizedFolder}`;

            // Ensure directory exists (recursive). Ignore "exists" errors.
            try {
                await ftpConnection.mkdir?.(targetDir, true);
            } catch (err: any) {
                const msg = String(err?.message || err || '').toLowerCase();
                const code = String(err?.code || '').toLowerCase();

                // Ignore "already exists" errors
                if (
                    !msg.includes('exist') &&
                    code !== 'eexist' &&
                    code !== '550'
                ) {
                    throw new InternalServerErrorException(
                        'Failed to prepare directory on FTP',
                    );
                }
            }

            await ftpConnection.put(buffer, `${targetDir}/${sanitizedFile}`);
            return 'File uploaded successfully';
        } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new InternalServerErrorException('Unable to upload file');
        } finally {
            if (ftpConnection) {
                await releaseFtpConnection(ftpConnection);
            }
        }
    }
}
