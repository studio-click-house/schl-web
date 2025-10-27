declare module '@zerobounce/zero-bounce-sdk' {
    /**
     * Main SDK class for interacting with the ZeroBounce API.
     */
    export default class ZeroBounceSDK {
        private _initialized: boolean;
        private _api_key: string | null;

        /**
         * Creates a new instance of the SDK.
         */
        constructor();

        /**
         * Initializes the SDK with your API key.
         * @param apiKey Your ZeroBounce API key.
         */
        init(apiKey: string): void;

        /**
         * Retrieves your remaining API credit balance.
         */
        getCredits(): Promise<CreditsResponse>;

        /**
         * Validates a single email address.
         * @param email The email address to validate.
         * @param ipAddress Optional IP address associated with the validation.
         */
        validateEmail(
            email: string,
            ipAddress?: string,
        ): Promise<ValidateEmailResponse>;

        /**
         * Retrieves API usage between two dates.
         * @param startDate Start date in YYYY-MM-DD format.
         * @param endDate End date in YYYY-MM-DD format.
         */
        getApiUsage(
            startDate: string,
            endDate: string,
        ): Promise<ApiUsageResponse>;

        /**
         * Validates a batch of email addresses.
         * @param emailList Array of objects each containing an email_address field.
         */
        validateBatch(
            emailList: { email_address: string }[],
        ): Promise<{ email_batch: ValidateEmailResponse[]; errors: any[] }>;

        /**
         * Retrieves activity history for a given email.
         * @param email The email address to query.
         */
        getEmailActivity(email: string): Promise<EmailActivityResponse>;

        /**
         * Sends a file of emails for validation.
         * @param options Configuration options for file upload.
         */
        sendFile(options: SendFileOptions): Promise<FileStatusResponse>;

        /**
         * Sends a file of emails for scoring.
         * @param options Configuration options for scoring file upload.
         */
        sendScoringFile(
            options: SendScoringFileOptions,
        ): Promise<FileStatusResponse>;

        /**
         * Retrieves the status of a file validation job.
         * @param fileId The file ID returned from sendFile.
         */
        getFileStatus(fileId: string): Promise<FileStatusResponse>;

        /**
         * Retrieves the status of a file scoring job.
         * @param fileId The file ID returned from sendScoringFile.
         */
        getScoringFileStatus(fileId: string): Promise<FileStatusResponse>;

        /**
         * Downloads a completed validation file as a Blob.
         * @param fileId The file ID to download.
         */
        getFile(fileId: string): Promise<Blob>;

        /**
         * Downloads a completed scoring file as a Blob.
         * @param fileId The file ID to download.
         */
        getScoringFile(fileId: string): Promise<Blob>;

        /**
         * Deletes a previously uploaded validation file.
         * @param fileId The file ID to delete.
         */
        deleteFile(fileId: string): Promise<void>;

        /**
         * Deletes a previously uploaded scoring file.
         * @param fileId The file ID to delete.
         */
        deleteScoringFile(fileId: string): Promise<void>;

        /**
         * Attempts to guess the format of email addresses from a domain.
         * @param options Configuration options for guessFormat.
         */
        guessFormat(options: GuessFormatOptions): Promise<GuessFormatResponse>;
    }

    /** Response when querying credit balance */
    export interface CreditsResponse {
        Credits: number;
    }

    /** Common email validation result */
    export interface ValidateEmailResponse {
        address: string;
        status: string;
        sub_status: string;
        free_email: boolean;
        did_you_mean: string | null;
        account?: string | null;
        domain: string;
        domain_age_days?: number | null;
        smtp_provider?: string | null;
        mx_found: boolean;
        mx_record?: string | null;
        firstname?: string | null;
        lastname?: string | null;
        gender?: string | null;
        country?: string | null;
        region?: string | null;
        city?: string | null;
        zipcode?: string | null;
        processed_at?: string;
    }

    /** Single record of API usage */
    export interface UsageRecord {
        date: string;
        email_credits?: number;
        sms_credits?: number;
    }

    /** Response when querying API usage */
    export interface ApiUsageResponse {
        start_date: string;
        end_date: string;
        usage: UsageRecord[];
    }

    /** Response for batch validation file jobs */
    export interface FileStatusResponse {
        file_id: string;
        status: 'pending' | 'processing' | 'completed' | 'error';
        total_records?: number;
        processed_records?: number;
        error_records?: number;
        download_url?: string;
    }

    /** Response when querying email activity */
    export interface EmailActivityResponse {
        email: string;
        status: string;
        activity: {
            activity_code: number;
            activity_date: string;
        }[];
    }

    /** Response when guessing email format */
    export interface GuessFormatResponse {
        format: string;
        domain: string;
    }

    /**
     * Options for sending a file for email validation.
     */
    export interface SendFileOptions {
        file: File;
        /** 1-based column index for email addresses */
        email_address_column: number;
        /** Callback URL when processing is complete */
        return_url?: string;
        /** 1-based column index for first names */
        first_name_column?: number;
        /** 1-based column index for last names */
        last_name_column?: number;
        /** 1-based column index for gender */
        gender_column?: number;
        /** 1-based column index for IP address */
        ip_address_column?: number;
        /** Indicates the first row is a header row */
        has_header_row?: boolean;
        /** Remove duplicate emails */
        remove_duplicate?: boolean;
    }

    /**
     * Options for sending a file for email scoring.
     */
    export interface SendScoringFileOptions {
        file: File;
        /** 1-based column index for email addresses */
        email_address_column: number;
        /** Callback URL when processing is complete */
        return_url?: string;
        /** Indicates the first row is a header row */
        has_header_row?: boolean;
        /** Remove duplicate emails */
        remove_duplicate?: boolean;
    }

    /**
     * Options for guessing email format based on domain.
     */
    export interface GuessFormatOptions {
        domain: string;
        first_name?: string;
        middle_name?: string;
        last_name?: string;
    }
}
