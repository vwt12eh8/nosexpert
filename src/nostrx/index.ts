import { Event, Filter, matchFilters } from "nostr-tools";
import { Observable, filter } from "rxjs";

export interface Relay {
    readonly notice: Observable<string>;
    close(): void;
    event(event: Event, nip20: AbortSignal | boolean | number): Promise<void>;
    req(subscriptionId?: string): RelayReq;
}

export abstract class RelayReq extends Observable<Event | "eose"> {
    public abstract close(): void;
    public abstract setFilters(...filters: readonly Filter[]): Promise<void>;
}

function _afterEose(obs: Observable<Event | "eose">) {
    return new Observable<Event>((sub) => {
        let isEose = false;
        return obs.subscribe({
            complete: sub.complete.bind(sub),
            error: sub.error.bind(sub),
            next: (x) => {
                if (x === "eose") {
                    isEose = true;
                } else if (isEose) {
                    sub.next(x);
                }
            }
        });
    });
}

export function afterEose() {
    return _afterEose;
}

function _beforeEose(obs: Observable<Event | "eose">) {
    return new Observable<Event>((sub) => obs.subscribe({
        complete: sub.complete.bind(sub),
        error: sub.error.bind(sub),
        next: (x) => {
            if (x === "eose") {
                sub.complete();
            } else if (!sub.closed) {
                sub.next(x);
            }
        }
    }));
}

export function beforeEose() {
    return _beforeEose;
}

export function filters(filters: readonly Filter[]) {
    return filter(matchFilters.bind(null, filters as Filter[]));
}
