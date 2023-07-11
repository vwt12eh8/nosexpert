import { Event, EventTemplate, UnsignedEvent, nip04 } from "nostr-tools";
import { useEffect, useState } from "react";

export interface Nip07 {
    readonly nip04: typeof nip04;
    getPublicKey(): Promise<string>;
    getRelays(): Promise<{ [url: string]: { read: boolean, write: boolean; }; }>;
    signEvent(event: EventTemplate | UnsignedEvent): Promise<Event>;
}

export function useNip07() {
    const [nip07, setNip07] = useState<Nip07 | undefined>((window as any).nostr);
    useEffect(() => {
        if (nip07) return;
        const t = setTimeout(() => setNip07((window as any).nostr), 500);
        return () => clearTimeout(t);
    }, []);
    return nip07;
}
