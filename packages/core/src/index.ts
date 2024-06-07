import {
    AdvanceRequestHandler,
    InspectRequestHandler,
    Notice,
    Report,
    Voucher,
} from "./types";

export * from "./types";
export * from "./schema";

/**
 * Application interface that defines methods for creating notices, reports, and vouchers,
 * and for handling advance and inspect requests.
 */
export interface App {
    /**
     * Starts the application.
     * @returns {Promise<void>} A promise that resolves when the application starts.
     */
    start(): Promise<void>;

    /**
     * Creates a new notice and returns the index of the created notice.
     * @param {Notice} request - The notice object containing payload data.
     * @returns {Promise<number>} A promise that resolves to the index of the created notice.
     * @throws {Error} Throws an error if the response does not contain data or if the response status is not OK.
     * @example
     * ```ts
     * const index = await app.createNotice({ payload: "0x..." });
     * console.log(`Notice created with index: ${index}`);
     * ```
     */
    createNotice(request: Notice): Promise<number>;

    /**
     * Creates a new report.
     * @param {Report} request - The report object containing payload data.
     * @returns {Promise<void>} A promise that resolves when the report is created.
     * @throws {Error} Throws an error if the response does not contain data or if the response status is not OK.
     * @example
     * ```ts
     * await app.createReport({ payload: "0x..." });
     * console.log("Report created successfully");
     * ```
     */
    createReport(request: Report): Promise<void>;

    /**
     * Creates a new voucher and returns the index of the created voucher.
     * @param {Voucher} request - The voucher object containing destination and payload data.
     * @returns {Promise<number>} A promise that resolves to the index of the created voucher.
     * @throws {Error} Throws an error if the response does not contain data or if the response status is not OK.
     * @example
     * ```ts
     * const voucherRequest = {
     *   destination: "0x1234567890abcdef1234567890abcdef12345678",
     *   payload: "0x..."
     * };
     * const index = await app.createVoucher(voucherRequest);
     * console.log(`Voucher created with index: ${index}`);
     * ```
     */
    createVoucher(request: Voucher): Promise<number>;

    /**
     * Adds an advance request handler.
     * @param {AdvanceRequestHandler} handler - The advance request handler.
     * @example
     * ```ts
     * app.addAdvanceHandler(async ({ payload }) => {
     *   const index = await app.createNotice({ payload });
     *   console.log(`Notice created with index: ${index}`);
     *   return "accept";
     * });
     * ```
     */
    addAdvanceHandler(handler: AdvanceRequestHandler): void;

    /**
     * Adds an inspect request handler.
     * @param {InspectRequestHandler} handler - The inspect request handler.
     * @example
     * ```ts
     * app.addInspectHandler(async ({ payload }) => {
     *   await app.createReport({ payload });
     *   console.log("Report created successfully");
     * });
     * ```
     */
    addInspectHandler(handler: InspectRequestHandler): void;
}