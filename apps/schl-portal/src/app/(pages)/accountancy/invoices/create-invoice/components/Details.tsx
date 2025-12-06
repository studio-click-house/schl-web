'use client';
import { toastFetchError, useAuthedFetchApi } from '@/lib/api-client';
import {
    BankAustraliaAccount,
    BankBangladeshAccount,
    BankEurozoneAccount,
    BankUKAccount,
    BankUSAAccount,
} from '@repo/common/constants/bank-details.constant';
import generateInvoice, {
    BankAccountsType,
    BillDataType,
    InvoiceDataType,
} from '@repo/common/lib/invoice';
import { ClientDocument } from '@repo/common/models/client.schema';
import { OrderDocument } from '@repo/common/models/order.schema';
import { getTodayDate } from '@repo/common/utils/date-helpers';
import { cn } from '@repo/common/utils/general-utils';

import 'flowbite';
import { initFlowbite } from 'flowbite';
import { PlusCircleIcon, X } from 'lucide-react';
import moment from 'moment-timezone';
import { useSession } from 'next-auth/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const baseZIndex = 50; // 52

interface DetailsProps {
    className?: string;
    clientCode: string;
    filters: {
        folder: string;
        clientCode: string;
        task: string;
        status: string;
        fromDate: string;
        toDate: string;
    };
}

const Details: React.FC<DetailsProps> = props => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [clientDetails, setClientDetails] = useState<ClientDocument | null>(
        null,
    );
    const { data: session } = useSession();
    const authedFetchApi = useAuthedFetchApi();

    const [orders, setOrders] = useState<OrderDocument[]>([]);

    const [loading, setLoading] = useState<boolean>(false);
    const [invoiceCreating, setInvoiceCreating] = useState<boolean>(false);

    const popupRef = useRef<HTMLElement>(null);

    const [customer, setCustomer] = useState({
        companyName: '',
        companyAddress: '',
        contactPerson: '',
        email: '',
        contactNumber: '',
        invoiceNumber: '',
        currency: '',
        prices: '',
    });

    const [vendor, setVendor] = useState({
        companyName: 'Studio Click House Ltd.',
        contactPerson: 'Raiyan Abrar',
        companyAddress:
            'AB Tower, Level 1, West Boxnagar, Sarulia, Dmera, Dhaka-1361, Bangladesh',
        contactNumber: '+8809609777111, +8801819727117',
        email: 'accounts@studioclickhouse.com',
    });

    const handleClickOutside = (e: React.MouseEvent<HTMLDivElement>) => {
        if (
            popupRef.current &&
            !popupRef.current.contains(e.target as Node) &&
            !popupRef.current.querySelector('input:focus, textarea:focus') &&
            !popupRef.current.querySelector('button:focus')
        ) {
            setIsOpen(false);
        }
    };

    const prepareBillData = (orders: OrderDocument[]): BillDataType[] => {
        const billData = orders.map((order, index) => {
            return {
                date: moment(order.createdAt).format('YYYY-MM-DD'),
                job_name:
                    order.folder ?? 'Folder path is not provided for this task',
                quantity: order.quantity ?? 0,
                unit_price: order.rate ?? 0,
                total: function () {
                    return (this.quantity ?? 0) * this.unit_price;
                },
            };
        });
        return billData;
    };

    const createInvoice = useCallback(async () => {
        try {
            setInvoiceCreating(true);

            if (!customer.invoiceNumber) {
                toast.error('Please enter an Invoice Number');
                return;
            }

            if (!customer.currency) {
                toast.error('Please enter a currency symbol/code');
                return;
            }

            const billData = prepareBillData(orders);

            if (!billData.length) {
                toast.error('No orders found to create invoice');
                return;
            }

            const invoiceData: InvoiceDataType = {
                customer: {
                    client_name: customer.companyName,
                    client_code: props.clientCode,
                    contact_person: customer.contactPerson,
                    address: customer.companyAddress,
                    contact_number: customer.contactNumber,
                    email: customer.email,
                    invoice_number: customer.invoiceNumber,
                    currency: customer.currency,
                },
                vendor: {
                    company_name: vendor.companyName,
                    contact_person: vendor.contactPerson,
                    address: vendor.companyAddress,
                    contact_number: vendor.contactNumber,
                    email: vendor.email,
                },
            };

            let secondaryBankAccount = null;
            switch (customer.currency) {
                case '$':
                    secondaryBankAccount = BankUSAAccount;
                    break;
                case 'C$':
                    secondaryBankAccount = BankUSAAccount;
                    break;
                case 'A$':
                    secondaryBankAccount = BankAustraliaAccount;
                    break;
                case '£':
                    secondaryBankAccount = BankUKAccount;
                    break;
                case '€':
                    secondaryBankAccount = BankEurozoneAccount;
                    break;
                case 'NOK':
                    secondaryBankAccount = BankEurozoneAccount;
                    break;
                case 'DKK':
                    secondaryBankAccount = BankEurozoneAccount;
                    break;
                case 'SEK':
                    secondaryBankAccount = BankEurozoneAccount;
                    break;
                default:
                    secondaryBankAccount = BankBangladeshAccount;
                    break;
            }

            const bankDetails: BankAccountsType = [
                BankBangladeshAccount,
                secondaryBankAccount,
            ];

            const fileName = `invoice_studioclickhouse_${customer.invoiceNumber}.xlsx`;

            const toastId = toast.loading('Generating invoice...') as string;

            const invoice = await generateInvoice(
                invoiceData,
                billData,
                bankDetails,
            );
            if (!invoice) {
                toast.error('Unable to generate invoice', { id: toastId });
                return;
            }

            toast.success('Invoice generated successfully', {
                id: toastId,
            });

            // Save invoice in local storage
            const url = window.URL.createObjectURL(invoice);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            anchor.click();
            window.URL.revokeObjectURL(url);

            toast.loading('Saving invoice in database...', { id: toastId });

            if (!clientDetails?._id || !clientDetails?.client_code) {
                toast.error('Client details are required to save the invoice', {
                    id: toastId,
                });
                return;
            }

            if (!session?.user?.real_name) {
                toast.error('Missing creator information for invoice', {
                    id: toastId,
                });
                return;
            }

            if (!props.filters.fromDate) {
                toast.error('From date is required to create invoice', {
                    id: toastId,
                });
                return;
            }

            const invoicePayload = {
                clientId: clientDetails?._id,
                clientCode: clientDetails?.client_code,
                createdBy: session?.user?.real_name,
                timePeriod: {
                    fromDate: props.filters.fromDate,
                    toDate: props.filters.toDate || getTodayDate(),
                },
                totalOrders: orders.length,
                invoiceNumber: customer.invoiceNumber,
            };

            const database_response = await authedFetchApi<{ message: string }>(
                { path: '/v1/invoice/create-invoice' },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(invoicePayload),
                },
            );

            if (!database_response.ok) {
                toastFetchError(database_response, toastId);
                return;
            }

            toast.success(
                "Invoice saved successfully in database. Don't close!",
                {
                    id: toastId,
                },
            );

            toast.loading('Saving invoice in ftp...', { id: toastId });

            const formData = new FormData();
            formData.append(
                'file',
                new File([invoice], fileName, { type: invoice.type }),
            );

            const ftp_response = await authedFetchApi<{ message: string }>(
                { path: '/v1/ftp/upload', query: { folderName: 'invoice' } },
                {
                    method: 'POST',
                    body: formData,
                },
            );

            if (!ftp_response.ok) {
                toastFetchError(
                    ftp_response,
                    'Unable to save invoice in FTP',
                    toastId,
                );
                return;
            }

            toast.success('Invoice saved successfully in ftp', {
                id: toastId,
            });

            toast.dismiss(toastId);

            toast.success('Invoice created successfully!');
        } catch (e) {
            console.error(e);
            toast.error('An error occurred while creating invoice');
        } finally {
            setInvoiceCreating(false);
        }
    }, [
        customer,
        vendor,
        orders,
        clientDetails,
        props.filters,
        props.clientCode,
        session,
        authedFetchApi,
    ]);

    const getClientOrders = useCallback(async () => {
        try {
            setLoading(true);

            const response = await authedFetchApi<
                OrderDocument[] | { items?: OrderDocument[] }
            >(
                {
                    path: '/v1/order/search-orders',
                    query: {
                        paginated: false,
                        // filtered: true,
                    },
                },
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...props.filters,
                        type: 'general',
                        invoice: true,
                    }),
                    cache: 'no-store',
                },
            );

            if (response.ok) {
                const data = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response.data?.items)
                      ? response.data.items
                      : [];
                setOrders(data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving orders data');
        } finally {
            setLoading(false);
        }
        return;
    }, [authedFetchApi, props.filters]);

    const getClientDetails = useCallback(async () => {
        try {
            setLoading(true);

            if (!props.clientCode) {
                toast.error('Client code is required');
                return;
            }

            const response = await authedFetchApi<ClientDocument>(
                {
                    path: `/v1/client/get-client/${encodeURIComponent(props.clientCode)}`,
                },
                {
                    method: 'GET',
                },
            );

            if (response.ok) {
                setClientDetails(response.data);
            } else {
                toastFetchError(response);
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while retrieving client data');
        } finally {
            setLoading(false);
        }
        return;
    }, [authedFetchApi, props.clientCode]);

    // Only fetch client details / orders when the user opens the modal.
    // Avoids fetching these on mount (two modal instances were mounted in the parent)
    // and prevents duplicate fetches if client/filter didn't change.
    const lastFetchedFiltersRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isOpen) return; // only fetch when modal is open
        if (!props.filters.clientCode) return;

        const serializedFilters = JSON.stringify(props.filters);
        // If we've already fetched for the same client and same filters, skip
        if (
            lastFetchedFiltersRef.current &&
            lastFetchedFiltersRef.current === serializedFilters
        ) {
            return;
        }

        getClientDetails();
        getClientOrders();
        lastFetchedFiltersRef.current = serializedFilters;
    }, [isOpen, props.filters, getClientDetails, getClientOrders]);

    useEffect(() => {
        initFlowbite();
    }, []);

    useEffect(() => {
        if (clientDetails) {
            setCustomer({
                companyName: clientDetails.client_name ?? '',
                companyAddress: clientDetails.address
                    ? clientDetails.address.trim().endsWith(',')
                        ? `${clientDetails.address} ${clientDetails.country}`
                        : `${clientDetails.address}, ${clientDetails.country}`
                    : (clientDetails.country ?? ''),
                contactPerson: clientDetails.contact_person ?? '',
                email: clientDetails.email ?? '',
                contactNumber: clientDetails.contact_number ?? '',
                invoiceNumber: (() => {
                    const lastInvoiceNumber =
                        clientDetails?.last_invoice_number;
                    const baseCode =
                        clientDetails?.client_code?.split('_')?.[1] || '00XX';
                    if (lastInvoiceNumber) {
                        const numericPart = lastInvoiceNumber.match(/\d+/)?.[0];
                        return numericPart
                            ? `${baseCode}${(parseInt(numericPart) + 1)
                                  .toString()
                                  .padStart(4, '0')}`
                            : `${baseCode}0001`;
                    }
                    return `${baseCode}00XX`;
                })(),
                currency: clientDetails.currency ?? '',
                prices: clientDetails.prices ?? '',
            });
        }
    }, [clientDetails]);

    const handleChangeClient = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setCustomer({ ...customer, [e.target.name]: e.target.value });
    };

    const handleChangeVendor = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setVendor({ ...vendor, [e.target.name]: e.target.value });
    };

    // We no longer early-return so the Create Invoice button is always present.
    // The button is disabled while loading or when client details are missing.
    const canOpenModal = !loading && !!props.clientCode;

    console.log('filters-in-details-modal::: ', props.filters);

    return (
        <>
            <button
                disabled={!canOpenModal || invoiceCreating}
                onClick={() => setIsOpen(true)}
                type="button"
                className={cn(
                    `flex flex-row gap-2 items-center rounded-md bg-primary justify-between hover:opacity-90 hover:ring-4 hover:ring-primary transition duration-200 delay-300 hover:text-opacity-100 text-white px-3 py-2`,
                    props.className,
                )}
            >
                <span>{loading ? 'Loading...' : 'Create Invoice'}</span>
                <PlusCircleIcon size={18} />
            </button>

            <section
                onClick={handleClickOutside}
                className={`fixed z-${baseZIndex} inset-0 flex justify-center items-center transition-colors ${isOpen ? 'visible bg-black/20 disable-page-scroll' : 'invisible'} `}
            >
                <article
                    ref={popupRef}
                    onClick={e => e.stopPropagation()}
                    className={`${isOpen ? 'scale-100 opacity-100' : 'scale-125 opacity-0'} bg-white rounded-sm shadow relative md:w-[60vw] lg:w-[40vw]  text-wrap`}
                >
                    <header className="flex items-center align-middle justify-between px-4 py-2 border-b rounded-t">
                        <h3 className="text-gray-900 text-base lg:text-lg font-semibold uppercase">
                            Invoice Details
                        </h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            type="button"
                            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center "
                        >
                            <X size={18} />
                        </button>
                    </header>

                    <div className="overflow-x-hidden overflow-y-scroll max-h-[70vh] p-4 text-start">
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
                                    Customer Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="companyName"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Company Name
                                        </label>
                                        <input
                                            id="companyName"
                                            name="companyName"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.companyName}
                                            type="text"
                                            placeholder="Enter customer's company name"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="contactPerson"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Contact Person
                                        </label>
                                        <input
                                            id="contactPerson"
                                            name="contactPerson"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.contactPerson}
                                            type="text"
                                            placeholder="Enter contact person name"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.email}
                                            type="email"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="contactNumber"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Contact Number
                                        </label>
                                        <input
                                            id="contactNumber"
                                            name="contactNumber"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.contactNumber}
                                            type="tel"
                                            placeholder="Enter contact number"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="invoiceNumber"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Invoice Number
                                        </label>
                                        <input
                                            id="invoiceNumber"
                                            name="invoiceNumber"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.invoiceNumber}
                                            type="text"
                                            placeholder='Enter invoice number. Eg: "ABC0001"'
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="currency"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Currency
                                        </label>
                                        <input
                                            id="currency"
                                            name="currency"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.currency}
                                            type="text"
                                            placeholder='Enter currency symbol/code. Eg: "$"'
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="prices"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Prices
                                        </label>
                                        <textarea
                                            id="prices"
                                            rows={3}
                                            name="prices"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.prices}
                                            placeholder="Enter prices for the services provided"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="companyAddress"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Company Address
                                        </label>
                                        <textarea
                                            id="companyAddress"
                                            rows={3}
                                            name="companyAddress"
                                            onChange={handleChangeClient}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={customer.companyAddress}
                                            placeholder="Enter company address"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-4 pb-2 border-b">
                                    Vendor Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="vendorCompanyName"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Company Name
                                        </label>
                                        <input
                                            id="vendorCompanyName"
                                            name="companyName"
                                            onChange={handleChangeVendor}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={vendor.companyName}
                                            type="text"
                                            placeholder="Enter vendor's company name"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="vendorContactPerson"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Contact Person
                                        </label>
                                        <input
                                            id="vendorContactPerson"
                                            name="contactPerson"
                                            onChange={handleChangeVendor}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={vendor.contactPerson}
                                            type="text"
                                            placeholder="Enter contact person's name"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="vendorEmail"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Email
                                        </label>
                                        <input
                                            id="vendorEmail"
                                            name="email"
                                            onChange={handleChangeVendor}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={vendor.email}
                                            type="email"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="vendorContactNumber"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Contact Number
                                        </label>
                                        <input
                                            id="vendorContactNumber"
                                            name="contactNumber"
                                            onChange={handleChangeVendor}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={vendor.contactNumber}
                                            type="tel"
                                            placeholder="Enter contact number"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label
                                            htmlFor="vendorCompanyAddress"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Company Address
                                        </label>
                                        <textarea
                                            id="vendorCompanyAddress"
                                            rows={3}
                                            name="companyAddress"
                                            onChange={handleChangeVendor}
                                            className="appearance-none block w-full bg-gray-50 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                            value={vendor.companyAddress}
                                            placeholder="Enter company address"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    <footer
                        className={cn(
                            'flex items-center px-4 py-2 border-t justify-end gap-6 border-gray-200 rounded-b',
                        )}
                    >
                        <div className="space-x-2 justify-end">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-md bg-gray-600 text-white hover:opacity-90 hover:ring-2 hover:ring-gray-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                type="button"
                                disabled={invoiceCreating}
                            >
                                Close
                            </button>
                            <button
                                disabled={invoiceCreating}
                                onClick={() => {
                                    createInvoice();
                                }}
                                className="rounded-md bg-blue-600 text-white  hover:opacity-90 hover:ring-2 hover:ring-blue-600 transition duration-200 delay-300 hover:text-opacity-100 px-4 py-1"
                                type="button"
                            >
                                {invoiceCreating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </footer>
                </article>
            </section>
        </>
    );
};

export default Details;
