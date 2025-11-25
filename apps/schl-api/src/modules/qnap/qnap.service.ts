import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QNAP_ERROR_MAP } from '@repo/common/constants/qnap.constant';
import axios, { AxiosInstance } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import {
    ApiResponse,
    DeleteOptions,
    ListOptions,
    LoginResponseXml,
    QnapApiError,
} from './qnap.types';
import type { QnapSessionStore } from './session/session-store.interface';

type QnapParamPrimitive = string | number | boolean;
type QnapRequestParams = Record<
    string,
    QnapParamPrimitive | QnapParamPrimitive[] | null | undefined
>;

@Injectable()
export class QnapService implements OnModuleDestroy {
    private readonly http: AxiosInstance;
    private readonly logger = new Logger(QnapService.name);
    private readonly xmlParser: XMLParser;

    constructor(
        private readonly configService: ConfigService,
        @Inject('QNAP_SESSION_STORE')
        private readonly sessionStore: QnapSessionStore,
    ) {
        const host = this.configService.get<string>('QNAP_HOST');
        const port = this.configService.get<number>('QNAP_PORT') || 8080;
        const https = this.configService.get<string>('QNAP_HTTPS') === 'true';
        const protocol = https ? 'https' : 'http';
        const baseUrl = `${protocol}://${host}:${port}`;

        const defaultParamsSerializer = (
            p: QnapRequestParams | Record<string, unknown>,
        ): string => {
            const payload = p as QnapRequestParams;
            const preserve: string[] = Object.prototype.hasOwnProperty.call(
                payload,
                'pwd',
            )
                ? ['pwd']
                : [];
            return this.serializeParams(payload, preserve);
        };

        this.http = axios.create({
            baseURL: baseUrl,
            timeout: 30000, // 30s timeout
            // Centralize parameter serialization for consistent behaviour
            // across all API calls. We prefer to serialize using
            // encodeURIComponent which leaves spaces as `%20` (not `+`).
            // If a `pwd` param (pre-encoded password) is present we preserve
            // it to avoid double-encoding. The login() call still overrides
            // `paramsSerializer` explicitly to guarantee `pwd` preservation.
            paramsSerializer: defaultParamsSerializer,
        });

        // Initialize XML Parser for Auth responses
        this.xmlParser = new XMLParser();
    }

    /**
     * Encodes password for QNAP (Base64 -> URL Encoded).
     * Documentation Reference: "encode_string = ezEncode(utf16to8('${real_password}'))"
     */
    private ezEncode(str: string): string {
        return encodeURIComponent(Buffer.from(str, 'utf8').toString('base64'));
    }

    /**
     * Wraps every API request with SID management and auto re-login, since QNAP
     * responds with `status=3` when a session expires instead of a 401.
     */
    private async requestWithAuth(
        endpoint: string,
        params: QnapRequestParams = {},
        retry = true,
    ): Promise<ApiResponse> {
        let sid = await this.sessionStore.getSid();

        // If no session exists, login immediately
        if (!sid) {
            this.logger.log('No active session found. Logging in...');
            sid = await this.login();
        }

        try {
            // Serializer notes: we use the centralized axios serializer to
            // ensure consistent query encoding (spaces => %20). The `login`
            // flow still overrides to preserve the pre-encoded `pwd`.
            const response = await this.http.get<ApiResponse>(endpoint, {
                params: this.buildParamsWithSid(params, sid),
            });

            // this.logger.debug('Response path %s => %o', response);

            const data = response.data;

            // QNAP v5 Status Logic:
            // Status 1 = Success
            // Status 3 = Authentication Failure/Session Expired
            if (data.status === 3 && retry) {
                this.logger.warn(
                    'Session expired (Status 3). Re-authenticating...',
                );
                // Clear old session and relogin
                await this.sessionStore.setSid(null);
                await this.login();

                // Retry request with new SID
                return this.requestWithAuth(endpoint, { ...params }, false);
            }

            this.checkStatus(data, 'requestWithAuth');
            return data;
        } catch (error: unknown) {
            if (error instanceof QnapApiError) throw error;

            const message =
                error instanceof Error ? error.message : 'Unknown error';
            throw new QnapApiError('network', 0, message);
        }
    }

    /**
     * QNAP CGIs expect arrays as repeated keys (e.g. `file=a&file=b`).
     * Nesting in objects or using the `[]` suffix causes the API to ignore
     * inputs, so we normalize here before every request.
     */
    private buildParamsWithSid(
        params: QnapRequestParams = {},
        sid: string,
    ): QnapRequestParams {
        // Return a plain object and let the caller (axios) use a custom
        // paramsSerializer to keep exact encoding semantics (we want %20 for spaces not '+').
        return { ...params, sid };
    }

    /**
     * Serialize QNAP parameters into a CGI-friendly query string.
     * - Arrays are repeated as 'key=value&key=value'
     * - Values are encoded via encodeURIComponent unless the key is
     *   provided in `preserveKeys` (e.g. 'pwd' when pre-encoded)
     */
    private serializeParams(
        params: QnapRequestParams = {},
        preserveKeys: string[] = [],
    ): string {
        const parts: string[] = [];
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;

            if (Array.isArray(value)) {
                value.forEach(v => {
                    const keyEnc = encodeURIComponent(key);
                    const valStr = String(v);
                    const valEnc = preserveKeys.includes(key)
                        ? valStr
                        : encodeURIComponent(valStr);
                    parts.push(keyEnc + '=' + valEnc);
                });
                return;
            }

            const keyEnc = encodeURIComponent(key);
            const valStr = String(value);
            const valEnc = preserveKeys.includes(key)
                ? valStr
                : encodeURIComponent(valStr);
            parts.push(keyEnc + '=' + valEnc);
        });

        return parts.join('&');
    }

    private checkStatus(data: ApiResponse, context: string): void {
        // In v5, status 1 is standard success.
        if (data.status !== undefined && data.status !== 1) {
            const errorMessage =
                QNAP_ERROR_MAP[data.status] ||
                `API returned status ${data.status}`;
            throw new QnapApiError(context, data.status, errorMessage);
        }
    }

    /**
     * Updated Login for v5.1
     * Endpoint: /cgi-bin/authLogin.cgi
     * Response: XML
     */
    async login(): Promise<string> {
        const username = this.configService.get<string>('QNAP_USERNAME') || '';
        const password = this.configService.get<string>('QNAP_PASSWORD') || '';
        const encodedPassword = this.ezEncode(password);

        try {
            const response = await this.http.get<string>(
                '/cgi-bin/authLogin.cgi',
                {
                    params: {
                        user: username,
                        pwd: encodedPassword,
                        remme: 0, // 0: clean qtoken (basic sid login)
                    },
                    responseType: 'text', // Important: Axios tries to parse JSON by default
                    // Custom serializer to prevent double-encoding of the
                    // already-encoded `pwd` value while still encoding all other
                    // params safely and keeping the function types explicit.
                    paramsSerializer: (
                        params: QnapRequestParams | Record<string, unknown>,
                    ) => {
                        // preserving `pwd` which was already encoded before sending.
                        return this.serializeParams(
                            params as QnapRequestParams,
                            ['pwd'],
                        );
                    },
                },
            );

            // Parse XML Response
            // Auth endpoints only speak XML; Axios returns plain text so we
            // coerce to string before the parser touches it.
            const xmlPayload =
                typeof response.data === 'string'
                    ? response.data
                    : String(response.data);
            const parsed = this.xmlParser.parse(xmlPayload) as LoginResponseXml;

            // this.logger.debug('Parsed XML: %o', parsed);

            if (!parsed.QDocRoot || parsed.QDocRoot.authPassed !== 1) {
                const errorVal = parsed.QDocRoot?.errorValue || 0;
                throw new QnapApiError(
                    'login',
                    errorVal,
                    `Login failed. AuthPassed: ${parsed.QDocRoot?.authPassed}`,
                );
            }

            const sid = parsed.QDocRoot.authSid;

            if (!sid) {
                throw new QnapApiError(
                    'login',
                    0,
                    'Login passed but no SID returned',
                );
            }

            await this.sessionStore.setSid(sid);
            this.logger.log(
                `Logged in successfully. SID: ${sid.substring(0, 5)}...`,
            );

            return sid;
        } catch (err) {
            if (err instanceof QnapApiError) throw err;
            throw new QnapApiError('login', 0, (err as Error).message);
        }
    }

    /**
     * Updated Logout for v5.1
     * Endpoint: /cgi-bin/authLogout.cgi
     */
    async logout(): Promise<void> {
        const sid = await this.sessionStore.getSid();
        if (sid) {
            try {
                await this.http.get('/cgi-bin/authLogout.cgi', {
                    params: { sid },
                });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn(
                    `Logout request failed (${message}), clearing local session anyway`,
                );
            }
            await this.sessionStore.setSid(null);
        }
    }

    // --- File Operations (v5.0 API) ---

    /**
     * List Folder Contents
     * Uses 'v=1' to optimize performance (skips user/group name resolution)
     */
    async listFolderContents(options: ListOptions) {
        const data = await this.requestWithAuth(
            '/cgi-bin/filemanager/utilRequest.cgi',
            {
                func: 'get_list',
                is_iso: 0,
                list_mode: 'all',
                path: options.path,
                dir: options.dir || 'ASC',
                limit: options.limit ?? 100,
                sort: options.sort || 'filename',
                start: options.start ?? 0,
                hidden_file: options.hidden_file ?? 0,
                v: 1, // New in v5 for performance
            },
        );
        // checkStatus is handled inside requestWithAuth, but double check logic here
        return data;
    }

    async createFolder(path: string, name: string): Promise<ApiResponse> {
        const data = await this.requestWithAuth(
            '/cgi-bin/filemanager/utilRequest.cgi',
            {
                func: 'createdir',
                dest_path: path,
                dest_folder: name,
            },
        );
        return data;
    }

    async rename(
        path: string,
        oldName: string,
        newName: string,
    ): Promise<ApiResponse> {
        const data = await this.requestWithAuth(
            '/cgi-bin/filemanager/utilRequest.cgi',
            {
                func: 'rename',
                path,
                source_name: oldName,
                dest_name: newName,
            },
        );
        return data;
    }

    async move(
        sourcePath: string,
        items: string[],
        destPath: string,
        mode: 0 | 1 | 2 = 1, // 0: overwrite, 1: skip, 2: rename
    ): Promise<ApiResponse> {
        // Move/delete endpoints rely on PHP-style repeated keys, so we keep
        // the payload flat and let `buildParamsWithSid` duplicate entries.
        const base: QnapRequestParams = {
            func: 'move',
            source_path: sourcePath,
            dest_path: destPath,
            source_total: items.length,
            mode,
        };
        const data = await this.requestWithAuth(
            '/cgi-bin/filemanager/utilRequest.cgi',
            {
                ...base,
                source_file: items,
            },
        );

        return data;
    }

    async delete(
        path: string,
        items: string[],
        options: DeleteOptions = {},
    ): Promise<ApiResponse> {
        const baseParams: QnapRequestParams = {
            func: 'delete',
            path,
            file_total: items.length,
            v: 1, // verbose
        };

        if (options.force) {
            baseParams.force = 1; // v5 feature: permanently delete
        }

        const requestParams = { ...baseParams, file_name: items };

        // See note in move(): repeated `file_name` keys must be preserved.
        const data = await this.requestWithAuth(
            '/cgi-bin/filemanager/utilRequest.cgi',
            requestParams,
        );

        return data;
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.logout();
        } catch {
            // Ignore logout errors
        }
    }
}
