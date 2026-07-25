import { CartesiProvider } from "@cartesi/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { DecoderProvider } from "./decoder/registry";
import { ServerProvider, useServer } from "./server";

const queryClient = new QueryClient({
    // Shared defaults for every query; list pages additionally pass
    // placeholderData: keepPreviousData so tables don't flash while paging.
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** Binds @cartesi/react's client to the user-selected server URL. */
function CartesiNode({ children }: { children: ReactNode }) {
    const { server } = useServer();
    return <CartesiProvider rpcUrl={server}>{children}</CartesiProvider>;
}

const container = document.getElementById("root");
if (!container) throw new Error("missing #root element");

createRoot(container).render(
    <StrictMode>
        <ServerProvider>
            <DecoderProvider>
                <QueryClientProvider client={queryClient}>
                    <CartesiNode>
                        <BrowserRouter
                            basename={import.meta.env.BASE_URL.replace(
                                /\/$/,
                                "",
                            )}
                        >
                            <App />
                        </BrowserRouter>
                    </CartesiNode>
                </QueryClientProvider>
            </DecoderProvider>
        </ServerProvider>
    </StrictMode>,
);
