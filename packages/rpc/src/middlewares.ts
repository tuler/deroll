import {
    createJSONRPCErrorResponse,
    JSONRPCServerMiddleware,
} from "json-rpc-2.0";

export const logMiddleware: JSONRPCServerMiddleware<void> = async (
    next,
    request,
    serverParams,
) => {
    console.log(`request ${JSON.stringify(request)}`);
    return next(request, serverParams).then((response) => {
        console.log(`response ${JSON.stringify(response)}`);
        return response;
    });
};

export const exceptionMiddleware: JSONRPCServerMiddleware<void> = async (
    next,
    request,
    serverParams,
) => {
    try {
        return await next(request, serverParams);
    } catch (error: any) {
        if (error.code && request.id) {
            return createJSONRPCErrorResponse(
                request.id,
                error.code,
                error.message,
            );
        } else {
            throw error;
        }
    }
};
