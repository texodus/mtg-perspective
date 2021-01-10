/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import perspective from "@finos/perspective";

import "@finos/perspective-workspace";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";
import "@finos/perspective-workspace/dist/umd/material.css";
import "@finos/perspective-viewer/dist/umd/material-dense.css";

import "./upload_dialog.js";
import "./card_details.js";
import "./index.css";

import DEFAULT_LAYOUT from "./layout.json";

const worker = perspective.shared_worker();

const all_cards_req = fetch("./all_identifiers.arrow");
const deck_req = fetch("./deck.arrow");

// tappedout

function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Persistence

function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2);
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

async function save_deck(deck) {
    const view = deck.view();
    const arrow = await view.to_arrow();
    view.delete();
    localStorage.setItem("deck", ab2str(arrow));
}

function load_deck(deck) {
    if (localStorage.getItem("deck")) {
        deck.update(str2ab(localStorage.getItem("deck")));
    }
}

// Actions

async function card_select({detail: {id, selected, config: {filters}}}) {
    let config = await all_cards.view.get_config();
    const details = document.querySelector("card-details");
    const is_grouped = config.row_pivots.length > 0 || config.column_pivots.length > 0
    details.set_invalid();
    if (is_grouped && this !== all_cards_detail && filters.length > 0) {        
        all_cards_detail.setAttribute("filters", JSON.stringify(filters));
        await all_cards_detail.flush();
        document.querySelector("#card_selector").classList.add("show_details");
        await all_cards_detail.notifyResize();
    } else {
        if (this !== all_cards_detail) {
            document.querySelector("#card_selector").classList.remove("show_details");
            all_cards.notifyResize();
        }
        if (!selected) {
            details.clear();
        } else {
            await details.set_uuid(id[0]);
        }
    }
}

async function add_card_to_deck(deck_table) {
    const all_cards = document.querySelector("perspective-viewer#all_cards");
    const details = document.querySelector("card-details");
    if (details.has_uuid()) {
        const filter = [["uuid", "==", details.get_uuid()]];
        const view = all_cards.table.view({filter});
        const json = await view.to_json();
        view.delete();
        json[0].count = 0;
        deck_table.update([json[0]]);
        save_deck(deck_table);
    }
}

async function remove_card_from_deck(deck_table) {
    const details = document.querySelector("card-details");
    await deck_table.remove([details.get_uuid()]);
}

async function user_upload(table, deck_buffer, deck_table, {detail}) {
    const dialog = this;
    const workspace = document.querySelector("perspective-workspace");
    const new_table = worker.table(detail);
    const new_view = new_table.view();
    const json = await new_view.to_json();
    new_view.delete();
    const new_deck = worker.table(deck_buffer.slice(), {index: "uuid"});
    const length = json.length;
    let n = 0;
    for (const row of json) {
        const tview = table.view({
            filter: [["name", "==", row.Name]]
        });
        const json = await tview.to_json();
        tview.delete();
        new_deck.update([json[0]]);
        dialog.set_progress(n++, length)
    }
    const uview = new_deck.view();
    const arrow2 = await uview.to_arrow();
    uview.delete();
    new_deck.delete();
    deck_table.replace(arrow2);
    save_deck(deck_table);
    workspace.addTable("deck", deck_table);
    document.body.removeChild(dialog);
    open.innerHTML = "add";
    card_details.set_invalid();
}

function upload_deck(table, deck_buffer, deck_table) {
    const dialog = document.createElement("upload-dialog");
    dialog.addEventListener("upload-event", user_upload.bind(dialog, table, deck_buffer, deck_table));
    document.body.appendChild(dialog);
}

window.addEventListener("load", async () => {
    const workspace = document.querySelector("perspective-workspace");
    const add_to_deck = document.querySelector("#add_to_deck");
    const close = document.querySelector("#close");
    const open = document.querySelector("#open");
    const upload = document.querySelector("#upload");
    const clear = document.querySelector("#clear");
    const all_cards = document.querySelector("perspective-viewer#all_cards");
    const all_cards_detail = document.querySelector("perspective-viewer#all_cards_detail");

    const resp = await all_cards_req;
    const buffer = await resp.arrayBuffer();
    const table = worker.table(buffer, {index: "uuid"});

    const deck_resp = await deck_req;
    const deck_buffer = await deck_resp.arrayBuffer();
    const deck_table = worker.table(deck_buffer.slice(), {index: "uuid"});
    
    if (window.location.search.length > 0) {
        const dialog = document.createElement("upload-dialog");
        dialog.addEventListener("upload-event", user_upload.bind(dialog, table, deck_buffer, deck_table));
        document.body.appendChild(dialog);
        const name = window.location.search.slice(1);
        dialog._set_loading(name);
        console.log(name);
        const req = await fetch(
            "https://tappedout.net/api/deck/widget/",
            {
                method: "post",
                body: `board=&side=&c=type&deck=${name}&cols=6`,
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded"
                }
            });
        const json = await req.json();
        const parser = new DOMParser();
        const dom = parser.parseFromString(json.board, "text/html");
        let csv = "Qty,Name\n";
        for (const link of dom.querySelectorAll(".card-link")) {
            const num = parseInt(link.parentElement.parentElement.childNodes[0].nodeValue);
            const name = link.textContent;
            console.log(`${num}x of card ${name}`);
            csv += `${num},"${name}"\n`;
        }
        dialog.load_txt(csv);
    } else {
        load_deck(deck_table);
    }
    
    all_cards.load(table);
    all_cards.toggleConfig();
    all_cards.addEventListener("perspective-select", event => {
        card_select.call(all_cards, event)
    });

    all_cards.addEventListener("perspective-config-update", async () => {
        document.querySelector("#card_selector").classList.remove("show_details");
    });

    all_cards_detail.load(table);
    all_cards_detail.addEventListener("perspective-select", event => {
        card_select.call(all_cards_detail, event)
    });

    workspace.restore(DEFAULT_LAYOUT);
    workspace.addTable("deck", deck_table);
    workspace.addEventListener("perspective-select", event => {
        const card_details = document.querySelector("card-details");
        const open = document.querySelector("#open");
        if (!event.detail.selected) {
            open.innerHTML = "add";
            card_details.set_invalid();
        } else {
            open.innerHTML = "remove";
            card_details.set_uuid(event.detail.id[0]);
        }
    });

    add_to_deck.addEventListener("click", () => {
        add_card_to_deck(deck_table);
    });

    close.addEventListener("click", () => {
        const card_details = document.querySelector("card-details");
        document.querySelector("#modal").classList.add("hide");
        open.innerHTML = "add";
        card_details.set_invalid();
    });

    open.addEventListener("click", () => {
        if (open.textContent === "add") {
            document.querySelector("#modal").classList.remove("hide");
            all_cards.notifyResize();
        } else {
            remove_card_from_deck(deck_table);
            open.innerHTML = "add";
        }
    });

    clear.addEventListener("click", () => {
        deck_table.clear();
        workspace.addTable("deck", deck_table);
    });

    upload.addEventListener("click", () => {
        upload_deck(table, deck_buffer, deck_table)
    });
});
