'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { cn, fetchApi } from '@repo/common/utils/general-utils';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useValidation } from '../context/ValidationContext';
import { ValidationInputType, validationSchema } from '../schema';

const Form: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();
    const { setValidationResults, clearResults, validationResults } =
        useValidation();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ValidationInputType>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            emails: '',
        },
    });

    const handleClearResults = () => {
        clearResults();
        reset();
    };

    async function validate(data: ValidationInputType) {
        try {
            setLoading(true);
            const parsed = validationSchema.safeParse(data);

            console.log('DATA: ', data, 'Parsed Data: ', parsed.data);

            if (!parsed.success) {
                console.error(parsed.error.issues.map(issue => issue.message));
                toast.error('Invalid form data');
                return;
            }

            if (parsed.data.emails.trim() === '') {
                toast.error('Email(s) is/are required!');
                return;
            }

            const bodyData = parsed.data.emails.includes(';')
                ? { emails: parsed.data.emails }
                : { email: parsed.data.emails };

            // Use the API endpoint instead of calling ZeroBounce directly
            const endpoint = parsed.data.emails.includes(';')
                ? `/v1/validator/bulk-email/${encodeURIComponent(parsed.data.emails.replace(/;/g, ','))}`
                : `/v1/validator/single-email/${encodeURIComponent(parsed.data.emails)}`;

            const response = await fetchApi(endpoint, {
                method: 'GET',
            });

            if (!response.ok) {
                toast.error(response.data.error || 'Failed to validate emails');
                return;
            }

            const result = response.data;
            console.log('Validation result:', result);

            if (
                (!result.validations || result.validations.length === 0) &&
                !result.validation
            ) {
                toast.error('No valid email data returned');
                return;
            }

            // Handle both single and bulk validation results
            let validation_data;
            if (result.validations) {
                // Bulk validation
                validation_data = result.validations;
            } else if (result.validation) {
                // Single validation
                validation_data = [result.validation];
            } else {
                toast.error('No valid email data returned');
                return;
            }

            console.log('Validation Data: ', validation_data);

            // Store results in context
            setValidationResults(validation_data);

            toast.success(
                `Successfully validated ${validation_data.length} email(s)`,
            );
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while validating the email(s)');
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (data: ValidationInputType) => {
        await validate(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
                <label
                    className="uppercase tracking-wide text-gray-700 text-sm font-bold flex gap-2 mb-2"
                    htmlFor="grid-first-name"
                >
                    Email(s)*
                    <span className="cursor-pointer has-tooltip">
                        &#9432;
                        <span className="tooltip italic font-medium rounded-md text-xs shadow-lg p-1 px-2 bg-gray-100 ml-2">
                            Use <code>;</code> to separate multiple emails.
                            Don&apos;t use any spaces.
                        </span>
                    </span>
                </label>

                <div className="flex rounded-md">
                    <input
                        type="text"
                        placeholder="Enter email(s)"
                        {...register('emails')}
                        className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded-l-md py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                    />
                    <button
                        disabled={loading}
                        className="bg-primary text-white hover:opacity-90 transition duration-200 px-6 uppercase py-0 font-medium rounded-r-md border-l border-primary"
                        type="submit"
                    >
                        {loading ? 'Validating...' : 'Validate'}
                    </button>
                </div>

                <span className="text-red-700 text-wrap block text-xs mt-1">
                    {errors.emails && errors.emails.message}
                </span>

                {/* Optional clear button */}
                <button
                    type="button"
                    onClick={handleClearResults}
                    // if there's no validation data, hide the button
                    className={cn(
                        'mt-2 text-sm text-gray-600 hover:text-gray-800 underline',
                        {
                            hidden: !validationResults.length,
                        },
                    )}
                    disabled={loading}
                >
                    Clear Results
                </button>
            </div>
        </form>
    );
};

export default Form;
