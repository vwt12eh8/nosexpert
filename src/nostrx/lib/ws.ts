import { Event, Filter } from "nostr-tools";
import { EMPTY, Observable, filter, firstValueFrom, map, share, timeout } from "rxjs";
import { Relay, RelayReq } from "..";
import { abort } from "./abort";

export abstract class WebSocketRelay implements Relay {
    public readonly notice: Observable<string>;

    public constructor(private readonly _received: Observable<readonly unknown[]>) {
        this.notice = _received.pipe(
            filter((x) => x.length >= 2 && x[0] === "NOTICE"),
            map((x) => x[1] as string),
            share(),
        );
    }

    public abstract close(): void;

    public async event(event: Event, nip20: AbortSignal | boolean | number) {
        const res = firstValueFrom(this._received.pipe(
            filter((x) => x[0] === "OK" && x[1] === event.id),
            typeof nip20 === "number" ? timeout({
                each: nip20,
                with: () => EMPTY,
            }) : abort(typeof nip20 === "object" ? nip20 : undefined),
        ));
        this._send(["EVENT", event]);
        if (nip20) await res;
    }

    public req(subscriptionId?: string) {
        const relay = this;
        if (!subscriptionId) subscriptionId = Math.random().toString().slice(2);
        return new class extends RelayReq {
            public constructor() {
                super((sub) => relay._received.pipe(
                    filter((x) => {
                        if (x.length < 2 || x[1] !== subscriptionId) return false;
                        if (x[0] === "EVENT" && x.length >= 3) return true;
                        if (x[0] === "EOSE") return true;
                        return false;
                    }),
                    map((x) => x[0] === "EVENT" ? x[2] as Event : "eose" as const),
                ).subscribe(sub));
            }

            public async close() {
                await relay._send(["CLOSE", subscriptionId]);
            }

            public async setFilters(...filters: readonly Filter[]) {
                await relay._send(["REQ", subscriptionId, ...filters]);
            }
        };
    }

    protected abstract _send(data: readonly unknown[]): Promise<void>;
}
