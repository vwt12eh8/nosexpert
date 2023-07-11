import { Extension } from "@mui/icons-material";
import { Box, Button, ButtonGroup, TextField } from "@mui/material";
import { getEventHash } from "nostr-tools";
import React, { useState } from "react";
import { useNip07 } from "./common";

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
            </ButtonGroup>
        </Box>
    </Box>;
}
