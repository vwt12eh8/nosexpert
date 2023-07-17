import { Extension } from "@mui/icons-material";
import { Alert, IconButton, Snackbar, Stack, TextField, Tooltip } from "@mui/material";
import { Event, EventTemplate, UnsignedEvent, nip04 } from "nostr-tools";
import React, { useCallback, useEffect, useState } from "react";

export interface Nip07 {
    readonly nip04: typeof nip04;
    getPublicKey(): Promise<string>;
    getRelays(): Promise<{ [url: string]: { read: boolean, write: boolean; }; }>;
    signEvent(event: EventTemplate | UnsignedEvent): Promise<Event>;
}

export function RelaysField({ required, value, setValue }: { required?: boolean; value: string; setValue(value: string): void; }) {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const loadNip07 = useCallback(async () => {
        const nip07: Nip07 = (window as any).nostr;
        if (!nip07) {
            setError("NIP-07を利用できません");
            setOpen(true);
            return;
        }
        const relays = await nip07.getRelays();
        if (!relays) return;
        setValue(Object.keys(relays).join("\n"));
    }, [setValue]);
    return <Stack direction="row" spacing={1}>
        <TextField label="リレーURL" value={value} onChange={(ev) => setValue(ev.target.value)} fullWidth multiline minRows={2} required={required} />
        <Tooltip title="NIP-07から読み込む" sx={{ alignSelf: "center" }}>
            <IconButton onClick={loadNip07}><Extension /></IconButton>
        </Tooltip>
        <Snackbar open={open} autoHideDuration={5000} onClose={() => setOpen(false)}>
            <Alert severity="error">{error}</Alert>
        </Snackbar>
    </Stack>;
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
