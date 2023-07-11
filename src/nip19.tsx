import { Extension } from "@mui/icons-material";
import { Alert, Divider, IconButton, Stack, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import { nip19 } from "nostr-tools";
import React, { useCallback, useEffect, useState } from "react";
import { Nip07 } from "./common";

export function Nip19() {
    const [tabIdx, setTabIdx] = useState(history.state || "hex");
    const [output, setOutput] = useState<JSX.Element | Error>();
    const moveTab = (_: any, i: string) => {
        if (tabIdx === i) return;
        setTabIdx(i);
        setOutput(undefined);
        history.replaceState(i, "");
    };
    return <>
        <Tabs value={tabIdx} onChange={moveTab} variant="scrollable" scrollButtons>
            <Tab label="hex" value="hex" />
            <Tab label="naddr" value="naddr" />
            <Tab label="nevent" value="nevent" />
            <Tab label="note" value="note" />
            <Tab label="nprofile" value="nprofile" />
            <Tab label="npub" value="npub" />
            <Tab label="nrelay" value="nrelay" />
            <Tab label="nsec" value="nsec" />
        </Tabs>
        <Stack margin={2} spacing={2}>
            {tabIdx === "hex" && <Hex setOutput={setOutput} />}
            {tabIdx === "naddr" && <Naddr setOutput={setOutput} />}
            {tabIdx === "nevent" && <Nevent setOutput={setOutput} />}
            {tabIdx === "note" && <Simple convert={nip19.noteEncode} label="イベントID(hex)" setOutput={setOutput} />}
            {tabIdx === "nprofile" && <Nprofile setOutput={setOutput} />}
            {tabIdx === "npub" && <Npub setOutput={setOutput} />}
            {tabIdx === "nrelay" && <Simple convert={nip19.nrelayEncode} label="リレーURL" setOutput={setOutput} />}
            {tabIdx === "nsec" && <Simple convert={nip19.nsecEncode} label="秘密鍵(hex)" setOutput={setOutput} />}
            <Divider />
            {(output instanceof Error) ? <Alert severity="error">{output.message}</Alert> : output}
        </Stack>
    </>;
}

function Hex({ setOutput }: { setOutput(value: JSX.Element | Error | undefined): void; }) {
    const [input, setInput] = useState("");
    const decode = useCallback((value: string) => {
        setInput(value);
        if (!value) {
            setOutput(undefined);
            return;
        }
        try {
            const res = nip19.decode(value.startsWith("nostr:") ? value.substring(6) : value);
            if (res.type === "nevent") {
                setOutput(<>
                    <TextField variant="standard" label="イベント" value={res.data.id} />
                    <TextField variant="standard" label="公開鍵" value={res.data.author} />
                    <TextField variant="standard" label="リレー" value={res.data.relays?.join("\n") || ""} multiline />
                </>);
            } else if (res.type === "nprofile") {
                setOutput(<>
                    <TextField variant="standard" label="公開鍵" value={res.data.pubkey} />
                    <TextField variant="standard" label="リレー" value={res.data.relays?.join("\n") || ""} multiline />
                </>);
            } else if (res.type === "naddr") {
                setOutput(<>
                    <TextField variant="standard" label="kind" value={res.data.kind} />
                    <TextField variant="standard" label="識別子" value={res.data.identifier} />
                    <TextField variant="standard" label="公開鍵" value={res.data.pubkey} />
                    <TextField variant="standard" label="リレー" value={res.data.relays?.join("\n") || ""} multiline />
                </>);
            }
            else {
                setOutput(<TextField variant="standard" label="HEX" value={res.data} />);
            }
        } catch (ex: any) {
            setOutput(ex);
        }
    }, [setOutput]);
    return <>
        <TextField label="bech32" value={input} onChange={(ev) => decode(ev.target.value)} fullWidth />
    </>;
}

function Naddr({ setOutput }: { setOutput(value: JSX.Element | Error | undefined): void; }) {
    const [kind, setKind] = useState("");
    const [identifier, setIdentifier] = useState("");
    const [pubkey, setPubkey] = useState("");
    const [relays, setRelays] = useState("");
    useEffect(() => {
        if (!identifier || !kind || !pubkey) {
            setOutput(undefined);
            return;
        }
        try {
            const value = nip19.naddrEncode({
                identifier,
                kind: Number.parseInt(kind),
                pubkey: toHex(pubkey, "npub"),
                relays: relays ? relays.split("\n") : undefined,
            });
            setOutput(<TextField variant="standard" label="bech32" value={value} />);
        } catch (ex: any) {
            setOutput(ex);
        }
    }, [identifier, kind, pubkey, relays, setOutput]);
    return <>
        <TextField label="kind" value={kind} onChange={(ev) => setKind(ev.target.value)} required fullWidth />
        <TextField label="識別子" value={identifier} onChange={(ev) => setIdentifier(ev.target.value)} required fullWidth />
        <PublicKeyField allowNpub value={pubkey} setValue={setPubkey} onError={(x) => setOutput(new Error(x))} />
        <RelaysField value={relays} setValue={setRelays} setError={(x) => setOutput(new Error(x))} />
    </>;
}

function Nevent({ setOutput }: { setOutput(value: JSX.Element | Error | undefined): void; }) {
    const [identifier, setIdentifier] = useState("");
    const [pubkey, setPubkey] = useState("");
    const [relays, setRelays] = useState("");
    useEffect(() => {
        if (!identifier || !pubkey) {
            setOutput(undefined);
            return;
        }
        try {
            const value = nip19.neventEncode({
                id: toHex(identifier, "note"),
                author: toHex(pubkey, "npub"),
                relays: relays ? relays.split("\n") : undefined,
            });
            setOutput(<TextField variant="standard" label="bech32" value={value} />);
        } catch (ex: any) {
            setOutput(ex);
        }
    }, [identifier, pubkey, relays, setOutput]);
    return <>
        <TextField label="イベントID(hex/note)" value={identifier} onChange={(ev) => setIdentifier(ev.target.value)} required fullWidth />
        <PublicKeyField allowNpub value={pubkey} setValue={setPubkey} onError={(x) => setOutput(new Error(x))} />
        <RelaysField value={relays} setValue={setRelays} setError={(x) => setOutput(new Error(x))} />
    </>;
}

function Nprofile({ setOutput }: { setOutput(value: JSX.Element | Error | undefined): void; }) {
    const [pubkey, setPubkey] = useState("");
    const [relays, setRelays] = useState("");
    useEffect(() => {
        if (!pubkey) {
            setOutput(undefined);
            return;
        }
        try {
            const value = nip19.nprofileEncode({
                pubkey: toHex(pubkey, "npub"),
                relays: relays ? relays.split("\n") : undefined,
            });
            setOutput(<TextField variant="standard" label="bech32" value={value} />);
        } catch (ex: any) {
            setOutput(ex);
        }
    }, [pubkey, relays, setOutput]);
    return <>
        <PublicKeyField allowNpub value={pubkey} setValue={setPubkey} onError={(x) => setOutput(new Error(x))} />
        <RelaysField value={relays} setValue={setRelays} setError={(x) => setOutput(new Error(x))} />
    </>;
}

function Npub({ setOutput }: { setOutput(value: JSX.Element | Error | undefined): void; }) {
    const [input, setInput] = useState("");
    const encode = useCallback((value: string) => {
        setInput(value);
        if (!value) {
            setOutput(undefined);
            return;
        }
        try {
            setOutput(<TextField variant="standard" label="bech32" value={nip19.npubEncode(value)} />);
        } catch (ex: any) {
            setOutput(ex);
        }
    }, [setOutput]);
    return <>
        <PublicKeyField value={input} setValue={encode} onError={(x) => setOutput(new Error(x))} />
    </>;
}

function Simple({ convert, label, setOutput }: { label: string; setOutput(value: JSX.Element | Error | undefined): void; convert(x: string): string; }) {
    const [input, setInput] = useState("");
    const encode = useCallback((value: string) => {
        setInput(value);
        if (!value) {
            setOutput(undefined);
            return;
        }
        try {
            setOutput(<TextField variant="standard" label={"bech32"} value={convert(value)} />);
        } catch (ex: any) {
            setOutput(ex);
        }
    }, [convert, setOutput]);
    return <>
        {convert === nip19.nsecEncode && <Alert severity="warning">秘密鍵は誰にも知られないよう十分注意してください</Alert>}
        <TextField label={label} value={input} onChange={(ev) => encode(ev.target.value)} required fullWidth />
    </>;
}

function PublicKeyField({ allowNpub, value, setValue, onError }: { allowNpub?: boolean; value: string; setValue(value: string): void; onError(value: string): void; }) {
    const loadNip07 = useCallback(async () => {
        const nip07: Nip07 = (window as any).nostr;
        if (!nip07) {
            onError("NIP-07を利用できません");
            return;
        }
        const pubkey = await nip07.getPublicKey();
        if (!pubkey) return;
        setValue(pubkey);
    }, [onError, setValue]);
    const types = allowNpub ? "hex/npub" : "hex";
    return <Stack direction="row" spacing={1}>
        <TextField label={`公開鍵(${types})`} value={value} onChange={(ev) => setValue(ev.target.value)} required fullWidth />
        <Tooltip title="NIP-07から読み込む" sx={{ alignSelf: "center" }}>
            <IconButton onClick={loadNip07}><Extension /></IconButton>
        </Tooltip>
    </Stack>;
}

function RelaysField({ value, setValue, setError }: { value: string; setValue(value: string): void; setError(value: string): void; }) {
    const loadNip07 = useCallback(async () => {
        const nip07: Nip07 = (window as any).nostr;
        if (!nip07) {
            setError("NIP-07を利用できません");
            return;
        }
        const relays = await nip07.getRelays();
        if (!relays) return;
        setValue(Object.keys(relays).join("\n"));
    }, [setError, setValue]);
    return <Stack direction="row" spacing={1}>
        <TextField label="リレー" value={value} onChange={(ev) => setValue(ev.target.value)} fullWidth multiline minRows={2} />
        <Tooltip title="NIP-07から読み込む" sx={{ alignSelf: "center" }}>
            <IconButton onClick={loadNip07}><Extension /></IconButton>
        </Tooltip>
    </Stack>;
}

function toHex(value: string, type?: "note" | "npub") {
    if (value.startsWith("nostr:")) value = value.substring(6);
    if (type && value.startsWith(type)) value = nip19.decode(value.substring(type.length)).data as string;
    return value;
}
