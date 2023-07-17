import { Event, Filter } from "nostr-tools";
import { Subject } from "rxjs";
import { Relay, RelayReq } from ".";

export class Relays implements Relay {
    public readonly notice = new Subject<never>();
    public readonly urls: Set<string>;
    private readonly _relays = new Map<string, Promise<Relay>>();

    public constructor(private readonly _connect: (url: string, signal?: AbortSignal) => Promise<Relay>, urls?: Iterable<string>) {
        this.urls = new Set(urls);
    }

    public close() {
        for (const relay of this._relays.values()) {
            relay.then((x) => x.close());
        }
    }

    public async event(event: Event, nip20: number | boolean | AbortSignal) {
        const abort = new AbortController();
        if (nip20 instanceof AbortSignal) {
            nip20.throwIfAborted();
            nip20.addEventListener("abort", () => abort.abort());
        } else if (typeof nip20 === "number") {
            setTimeout(() => abort.abort(), nip20);
        }
        const signal = nip20 !== false && abort.signal;
        return await Promise.race(Array.from(this.urls).map(async (url) => {
            const relay = await this._connect(url, signal || undefined);
            await relay.event(event, signal);
        })).finally(() => abort.abort());
    }

    public req(subscriptionId?: string) {
        const relays = this._connectAll();
        const reqs = relays.map((x) => x.then((y) => y.req(subscriptionId)));
        return new class extends RelayReq {
            public constructor() {
                super((sub) => { reqs.map((req) => req.then((x) => sub.add(x.subscribe(sub)))); });
            }

            public close() {
                for (const req of reqs) {
                    req.then((x) => x.close());
                }
            }

            public async setFilters(...filters: readonly Filter[]): Promise<void> {
                await Promise.all(reqs.map((req) => req.then((x) => x.setFilters(...filters))));
            }
        };
    }

    private _connectAll() {
        const list: Promise<Relay>[] = [];
        for (const url of this.urls) {
            let p = this._relays.get(url);
            if (!p) {
                p = this._connect(url);
                this._relays.set(url, p);
                const onclose = () => this._relays.delete(url);
                p.then(
                    (x) => x.notice.subscribe({ complete: onclose, error: onclose }),
                    onclose,
                );
            }
            list.push(p);
        }
        return list;
    }
}
