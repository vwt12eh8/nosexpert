/// <reference lib="DOM" />
import { Menu } from "@mui/icons-material";
import { Alert, AppBar, Box, Drawer, IconButton, List, ListItemButton, ThemeProvider, Toolbar, Typography, createTheme, useMediaQuery } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Event } from "./event";
import { Nip19 } from "./nip19";

function AppRoot() {
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
    const theme = React.useMemo(() => createTheme({
        palette: {
            mode: prefersDarkMode ? 'dark' : 'light',
        },
    }), [prefersDarkMode]);
    useEffect(() => {
        document.body.style.color = prefersDarkMode ? "white" : "black";
        document.body.style.background = prefersDarkMode ? "black" : "white";
    }, [prefersDarkMode]);
    const hash = useLocationHash();
    return <ThemeProvider theme={theme}>
        <AppBar position="fixed">
            <Toolbar>
                <IconButton color="inherit" edge="start" onClick={() => setMenuOpen(!menuOpen)}>
                    <Menu />
                </IconButton>
                <Typography marginLeft={2}>{tabNames[hash]}</Typography>
            </Toolbar>
        </AppBar>
        <Box marginTop={8}>
            {hash === "#event" && <Event />}
            {hash === "#nip-19" && <Nip19 />}
            {hash === "" && <Box component="main" margin={2} marginTop={10}>
                <Alert severity="info">左のメニューから使用したい機能を選んでください</Alert>
                <Typography display="flex" justifyContent="center" marginTop={5}>Ver.0.1.0</Typography>
            </Box>}
        </Box>
        <Drawer variant="temporary" anchor="left" open={menuOpen} onClose={closeMenu}>
            <Toolbar />
            <List>
                {Object.entries(tabNames).slice(1).map((x) => <ListItemButton key={x[0]} href={x[0]} onClick={closeMenu}>{x[1]}</ListItemButton>)}
            </List>
        </Drawer>
    </ThemeProvider>;
}

const tabNames: Record<string, string | undefined> = {
    "": "スタート",
    "#event": "イベントエディタ",
    "#nip-19": "NIP-19",
};

function useLocationHash() {
    const [_, setUrl] = useState<string>(location.hash);
    useEffect(() => {
        const onhashchange = () => {
            setUrl(location.hash);
        };
        addEventListener("hashchange", onhashchange);
        return () => {
            removeEventListener("hashchange", onhashchange);
        };
    }, []);
    return location.hash;
}

navigator.serviceWorker?.register("./worker.js");
createRoot(document.body.appendChild(document.createElement("div"))).render(<AppRoot />);
