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
import {manaStyleListener} from "./mana_cost_utils.js";
import "./upload_dialog.js";
import "./card_details.js";

import "@finos/perspective-workspace/dist/umd/material.css";
import "@finos/perspective-viewer/dist/umd/material-dense.css";
import "./index.css";

import DEFAULT_LAYOUT from "./layout.json";

const worker = perspective.shared_worker();

const all_cards_req = fetch("./all_identifiers.arrow");
const deck_req = fetch("./deck.arrow");
const sym_req = fetch("./symbology.arrow");

async function with_view(table, config, body) {
    if (body === undefined) {
        body = config;
        config = {};
    }

    const view = table.view(config);
    const result = await body(view);
    view.delete();
    return result;
}

async function with_table(data, options, body) {
    if (body === undefined) {
        body = options;
        options = undefined;
    }

    const table = worker.table(data, options);
    const result = await body(table);
    table.delete();
    return result;
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
    await with_view(deck, {}, async view => {
        const arrow = await view.to_arrow();
        localStorage.setItem("deck", ab2str(arrow));
    });
}

function load_deck(deck) {
    if (localStorage.getItem("deck")) {
        deck.update(str2ab(localStorage.getItem("deck")));
    }
}

// Actions

async function card_select({detail: {id, selected, config: {filters}}}) {
    const all_cards = document.querySelector("perspective-viewer#all_cards");
    const all_cards_detail = document.querySelector("perspective-viewer#all_cards_detail");
    const card_selector = document.querySelector("#card_selector");
    let config = await all_cards.view.get_config();
    const details = document.querySelector("card-details");
    const is_grouped = config.row_pivots.length > 0 || config.column_pivots.length > 0
    details.set_invalid();
    if (is_grouped && this !== all_cards_detail && filters.length > 0) {        
        all_cards_detail.setAttribute("filters", JSON.stringify(filters));
        await all_cards_detail.flush();
        card_selector.classList.add("show_details");
        await all_cards_detail.notifyResize();
    } else {
        if (this !== all_cards_detail) {
            card_selector.classList.remove("show_details");
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
        const json = await with_view(all_cards.table, {filter}, view => view.to_json());
        json[0].count = 1;
        deck_table.update([json[0]]);
        save_deck(deck_table);
        hide_card_details();    
    }
}

async function remove_card_from_deck(deck_table) {
    const details = document.querySelector("card-details");
    const remove = document.querySelector("#remove");
    const uuid = details.get_uuid();
    const config = {filter: [["uuid", "==", uuid]]};
    const [row] = await with_view(deck_table, config, view => view.to_json());
    if (row && row.count > 1) {
        row.count = row.count - 1;
        deck_table.update([row]);
    } else{
        await deck_table.remove([uuid]);
        details.set_invalid();
        remove.classList.add("disabled");
        open.innerHTML = "add_circle_outline";
    }
}

async function _add_row_to_deck(table, new_deck, row) {
    const name = row.Name || row.name;
    if (name !== undefined) {
        const config = {filter: [["name", "==", name]]};
        const json = await with_view(table, config, view => view.to_json());
        if (json.length > 0) {
            json[0].count = row.Qty || row.qty || row.Count || row.count || 1;
            json[0].group = row.Group || row.group;
            await new_deck.update([json[0]]);
        }
    }
}

async function create_lookup_deck_arrow(dialog, table, deck_buffer, csv) {
    return await with_table(deck_buffer.slice(), {index: "uuid"}, async new_deck => {
        const json = await with_table(csv, new_table => {
            return with_view(new_table, view => view.to_json())
        });

        let n = 0;
        for (const row of json) {
            await _add_row_to_deck(table, new_deck, row);
            dialog.set_progress(n++, json.length);
        }

        return await with_view(new_deck, view => view.to_arrow());
    })
}

async function user_upload(table, deck_buffer, deck_table, {detail: csv}) {
    const workspace = document.querySelector("perspective-workspace");
    const remove = document.querySelector("#remove");
    const details = document.querySelector("card-details");
    const arrow = await create_lookup_deck_arrow(this, table, deck_buffer, csv)
    deck_table.replace(arrow);
    save_deck(deck_table);
    workspace.addTable("deck", deck_table);
    document.body.removeChild(this);
    remove.classList.add("disabled");
    open.innerHTML = "add_circle_outline";
    details.set_invalid();
}

function upload_deck(table, deck_buffer, deck_table) {
    const dialog = document.createElement("upload-dialog");
    dialog.addEventListener("upload-event", user_upload.bind(dialog, table, deck_buffer, deck_table));
    document.body.appendChild(dialog);
}

function hide_card_details() {
    const card_details = document.querySelector("card-details");
    document.querySelector("#modal").classList.add("hide");
    const remove = document.querySelector("#remove");
    remove.classList.add("disabled");
    open.innerHTML = "add_circle_outline";
    card_details.set_invalid();
}

window.addEventListener("load", async () => {
    const workspace = document.querySelector("perspective-workspace");
    const add_to_deck = document.querySelector("#add_to_deck");
    const close = document.querySelector("#close");
    const open = document.querySelector("#open");
    const remove = document.querySelector("#remove");
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

    const sym_resp = await sym_req;
    const sym_buffer = await sym_resp.arrayBuffer();
    const sym_table = worker.table(sym_buffer.slice(), {index: "symbol"});
    const sym_array = await sym_table.view({columns:["symbol", "svg_uri"]}).to_json();

    if (window.location.search.length > 0) {
        const dialog = document.createElement("upload-dialog");
        const upload_cb = user_upload.bind(dialog, table, deck_buffer, deck_table);
        dialog.addEventListener("upload-event", upload_cb);
        document.body.appendChild(dialog);
        dialog.load_tappedout_id(window.location.search.slice(1))
    } else {
        load_deck(deck_table);
    }

    all_cards.load(table).then(async () => {
        const regular_table = all_cards.querySelector("regular-table");
        regular_table.addStyleListener(manaStyleListener.bind(regular_table, sym_array));
    });
    all_cards.toggleConfig();
    all_cards.addEventListener("perspective-select", event => {
        card_select.call(all_cards, event)
    });

    all_cards.addEventListener("perspective-config-update", async () => {
        document.querySelector("#card_selector").classList.remove("show_details");
    });

    all_cards_detail.load(table).then(async () => {
        const regular_table = all_cards_detail.querySelector("regular-table");
        regular_table.addStyleListener(manaStyleListener.bind(regular_table, sym_array));
    });

    all_cards_detail.addEventListener("perspective-select", event => {
        card_select.call(all_cards_detail, event)
    });

    workspace.restore(DEFAULT_LAYOUT);
    workspace.addTable("deck", deck_table);
    workspace.addEventListener("perspective-select", event => {
        const card_details = document.querySelector("card-details");
        if (!event.detail.selected) {
            remove.classList.add("disabled");
            open.innerHTML = "add_circle_outline";
            card_details.set_invalid();
        } else {
            remove.classList.remove("disabled");
            open.innerHTML = "add";
            card_details.set_uuid(event.detail.id[0]);
        }
    });

    const registered_set = new Set();
    workspace.addEventListener("workspace-layout-update", () => {
        for (const regular_table of workspace.querySelectorAll("regular-table")) {
            if (regular_table && !registered_set.has(regular_table)) {
                registered_set.add(regular_table);
                const manacost = manaStyleListener.bind(regular_table, sym_array);
                regular_table.addStyleListener(manacost);
                regular_table.draw();
            } 
        } 
    });

    add_to_deck.addEventListener("click", () => {
        add_card_to_deck(deck_table);
    });

    close.addEventListener("click", hide_card_details.bind(this));

    open.addEventListener("click", async () => {
        const details = document.querySelector("card-details");
        if (details.has_uuid()) {
            const uuid = details.get_uuid();
            const config = {filter: [["uuid", "==", uuid]]};
            const [row] = await with_view(deck_table, config, view => view.to_json());
            if (row) {
                row.count = row.count + 1;
                await deck_table.update([row]);
            } 
        } else {
            document.querySelector("#modal").classList.remove("hide");
            all_cards.notifyResize();
        }
    });

    remove.addEventListener("click", () => {
        remove_card_from_deck(deck_table);
    });

    clear.addEventListener("click", () => {
        deck_table.clear();
        workspace.addTable("deck", deck_table);
    });

    upload.addEventListener("click", () => {
        upload_deck(table, deck_buffer, deck_table)
    });
});
