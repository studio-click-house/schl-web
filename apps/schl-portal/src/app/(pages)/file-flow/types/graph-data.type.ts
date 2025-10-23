export interface OrderData {
    date: string;
    orderQuantity: number;
    orderPending: number;
    fileQuantity: number;
    filePending: number;
}

export type CountryData = Record<
    string,
    Array<{
        date: string;
        orderQuantity: number;
        fileQuantity: number;
    }>
>;
