import { Extension } from "@mui/icons-material";
import { Alert, Box, Button, ButtonGroup, Dialog, DialogActions, DialogContent, Snackbar, TextField } from "@mui/material";
import { getEventHash, nip19, verifySignature } from "nostr-tools";
import React, { useState } from "react";
import { first, firstValueFrom } from "rxjs";
import { RelaysField, useNip07 } from "./common";
import { beforeEose } from "./nostrx";
import { Relays } from "./nostrx/multi";
import { DomRelay } from "./nostrx/ws-dom";

export function Event() {
    const [json, setJson] = useState(history.state || "");
    const [error, setError] = useState("");
    const updateJson = (value: string) => {
        setJson(value);
        history.replaceState(value, "");
        try {
            if (value) JSON.parse(value);
            setError("");
        } catch (ex: any) {
            setError(ex.message);
        }
    };
    const nip07 = useNip07();
    const calcId = () => {
        const j = JSON.parse(json);
        const id = getEventHash(j);
        j["id"] = id;
        setJson(JSON.stringify(j, undefined, 4));
    };
    const sign = async () => {
        const sig = await nip07?.signEvent(JSON.parse(json));
        setJson(JSON.stringify(sig, undefined, 4));
    };
    return <Box margin={2} marginTop={10}>
        <TextField value={json} onChange={(ev) => updateJson(ev.target.value)} fullWidth multiline minRows={10} error={!!error} helperText={error} />
        <Box display="flex" marginTop={2}>
            <ButtonGroup sx={{ flexGrow: 1 }}>
                <Button onClick={() => setJson(JSON.stringify(JSON.parse(json)))}>最小化</Button>
                <Button onClick={() => setJson(JSON.stringify(JSON.parse(json), undefined, 4))}>整形</Button>
            </ButtonGroup>
            <ButtonGroup>
                <Button onClick={calcId}>ID計算</Button>
                <Button disabled={!nip07} onClick={sign}><Extension fontSize="small" /><Box marginLeft={1}>署名</Box></Button>
                <Verify json={json} />
            </ButtonGroup>
        </Box>
        <Box display="flex" marginTop={2}>
            <ButtonGroup sx={{ flexGrow: 1 }}>
            </ButtonGroup>
            <ButtonGroup>
                <Downloader setJson={setJson} />
                <Uploader json={json} />
            </ButtonGroup>
        </Box>
    </Box>;
}

function Verify({ json }: { json: string; }) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [severity, setSeverity] = useState<"error" | "warning" | "success">("error");
    const verify = () => {
        setSeverity("error");
        try {
            const data = JSON.parse(json);
            if (!data.sig) {
                setSeverity("warning");
                setMessage("署名されていません");
            } else if (verifySignature(JSON.parse(json))) {
                setSeverity("success");
                setMessage("正しいイベントです");
            } else {
                setMessage("正しくないイベントです");
            }
        } catch (ex) {
            setMessage(ex instanceof Error ? ex.message : "不明なエラー");
        }
        setOpen(true);
    };
    return <>
        <Button onClick={verify}>検証</Button>
        <Snackbar open={open} autoHideDuration={5000} onClose={() => setOpen(false)}>
            <Alert severity={severity}>{message}</Alert>
        </Snackbar>
    </>;
}

function Downloader({ setJson }: { setJson(json: string): void; }) {
    const [open, setOpen] = useState(false);
    const [nevent, setNevent] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const download = async () => {
        setLoading(true);
        try {
            const data = nip19.decode(nevent);
            if (data.type !== "nevent") throw new Error("nevent形式で入力してください");
            const relays = new Relays(DomRelay.connect, data.data.relays);
            if (relays.urls.size === 0) throw new Error("このneventにはリレーURLが含まれていません");
            try {
                const req = relays.req();
                const res = firstValueFrom(req.pipe(
                    beforeEose(),
                    first((x) => x.id === data.data.id),
                ));
                await req.setFilters({ ids: [data.data.id] });
                setJson(JSON.stringify(await res, undefined, 4));
            } finally {
                relays.close();
            }
            setOpen(false);
        } catch (ex) {
            setError(ex instanceof Error ? ex.message : "不明なエラー");
        }
        setLoading(false);
    };
    return <>
        <Button onClick={() => setOpen(true)}>ダウンロード</Button>
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
            <DialogContent>
                <TextField label="nevent" value={nevent} onChange={(ev) => { setNevent(ev.target.value); setError(""); }} required error={!!error} helperText={error} fullWidth />
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={download} disabled={!nevent || loading}>取得</Button>
            </DialogActions>
        </Dialog>
    </>;
}

function Uploader({ json }: { json: string; }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [urls, setUrls] = useState(localStorage.getItem("relays") || "");
    const upload = async () => {
        setLoading(true);
        const relays = new Relays(DomRelay.connect, urls.split("\n"));
        try {
            await relays.event(JSON.parse(json), false);
            localStorage.setItem("relays", urls);
            setOpen(false);
        } finally {
            relays.close();
        }
        setLoading(false);
    };
    return <>
        <Button onClick={() => setOpen(true)} disabled={loading}>アップロード</Button>
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
            <DialogContent>
                <RelaysField value={urls} setValue={setUrls} required />
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={upload} disabled={!urls || loading}>送信</Button>
            </DialogActions>
        </Dialog>
    </>;
}
