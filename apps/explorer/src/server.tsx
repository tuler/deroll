import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from "react";

const STORAGE_KEY = "cartesi-explorer.server";
export const DEFAULT_SERVER = "http://localhost:10011/rpc";

interface ServerContextValue {
    server: string;
    setServer: (url: string) => void;
}

const ServerContext = createContext<ServerContextValue>({
    server: DEFAULT_SERVER,
    setServer: () => {},
});

export function ServerProvider({ children }: { children: ReactNode }) {
    const [server, setServerState] = useState(
        () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SERVER,
    );

    const setServer = useCallback((url: string) => {
        const trimmed = url.trim();
        if (!trimmed) return;
        localStorage.setItem(STORAGE_KEY, trimmed);
        setServerState(trimmed);
    }, []);

    return (
        <ServerContext.Provider value={{ server, setServer }}>
            {children}
        </ServerContext.Provider>
    );
}

export function useServer() {
    return useContext(ServerContext);
}
