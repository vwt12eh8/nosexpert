/// <reference lib="DOM" />
import { Observable, Subject, filter, map, share } from "rxjs";
import { getAbortError } from "./lib/abort";
import { WebSocketRelay } from "./lib/ws";

export class DomRelay extends WebSocketRelay {
    public constructor(private readonly _ws: WebSocket) {
        super(asObservable(_ws));
    }

    public close() {
        this._ws.close();
    }

    public get readyState() {
        return this._ws.readyState;
    }

    protected async _send(data: readonly unknown[]) {
        this._ws.send(JSON.stringify(data));
    }

    public static async connect(url: string | URL, signal?: AbortSignal) {
        const ws = new WebSocket(url);
        await whenConnected(ws, signal);
        return new DomRelay(ws);
    }
}

export class AutoConnectDomRelay extends WebSocketRelay {
    private _sub: Subject<readonly unknown[]>;
    private _ws?: WebSocket;

    public constructor(public readonly url: string | URL) {
        const sub = new Subject<readonly unknown[]>();
        super(sub);
        this._sub = sub;
    }

    public close() {
        if (this._ws) {
            this._ws.close();
            delete this._ws;
        }
    }

    private async _connect() {
        if (this._ws) {
            if (this._ws.readyState === WebSocket.OPEN) return this._ws;
            this._ws.close();
        }
        this._ws = new WebSocket(this.url);
        try {
            await whenConnected(this._ws);
            asObservable(this._ws).subscribe((x) => this._sub.next(x));
            return this._ws;
        } catch (ex) {
            this._ws.close();
            delete this._ws;
            throw ex;
        }
    }

    protected async _send(data: readonly unknown[]) {
        (await this._connect()).send(JSON.stringify(data));
    }
}

function asObservable(ws: WebSocket) {
    return new Observable((sub) => {
        if (ws.readyState >= ws.CLOSING) {
            sub.complete();
            return;
        }
        const onmessage = (ev: MessageEvent) => sub.next(ev.data);
        const onerror = () => sub.error(new DOMException());
        const onclose = () => sub.complete();
        ws.addEventListener("close", onclose);
        ws.addEventListener("error", onerror);
        ws.addEventListener("message", onmessage);
        return () => {
            ws.removeEventListener("message", onmessage);
            ws.removeEventListener("error", onerror);
            ws.removeEventListener("close", onclose);
        };
    }).pipe(
        map((x) => typeof x === "string" && JSON.parse(x)),
        filter(Array.isArray),
        share(),
    );
}

export function whenConnected(ws: WebSocket, signal?: AbortSignal) {
    if (ws.readyState >= ws.OPEN) return Promise.resolve(ws);
    return new Promise<WebSocket>((res, rej) => {
        if (signal?.aborted) return rej(getAbortError(signal));
        const onopen = () => res(ws);
        const onerror = (ev: globalThis.Event) => {
            signal?.removeEventListener("abort", onerror);
            ws.removeEventListener("open", onopen);
            ws.removeEventListener("error", onerror);
            ws.removeEventListener("close", onerror);
            if (signal?.aborted) {
                rej(getAbortError(signal));
            } else {
                rej(new DOMException((ev as CloseEvent).reason));
            }
        };
        ws.addEventListener("close", onerror);
        ws.addEventListener("error", onerror);
        ws.addEventListener("open", onopen);
        signal?.addEventListener("abort", onerror);
    });
}
