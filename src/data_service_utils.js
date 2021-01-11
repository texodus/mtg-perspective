/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import perspective from "@finos/perspective";

export const worker = perspective.shared_worker();

export async function with_view(table, config, body) {
    if (body === undefined) {
        body = config;
        config = {};
    }

    const view = table.view(config);
    const result = await body(view);
    view.delete();
    return result;
}

export async function with_table(data, options, body) {
    if (body === undefined) {
        body = options;
        options = undefined;
    }

    const table = worker.table(data, options);
    const result = await body(table);
    table.delete();
    return result;
}

export function scryfall_id_to_img_url(scryfall_id) {
    return `https://c1.scryfall.com/file/scryfall-cards/normal/front/${scryfall_id[0]}/${scryfall_id[1]}/${scryfall_id}.jpg?1562404626`
}

export async function uuid_to_scryfall_id(uuid) {
    const all_cards = document.body.querySelector("#all_cards");
    const view = all_cards.table.view({
        filter: [["uuid", "==", uuid]],
        columns: ["scryfallId"]
    });
    const json = await view.to_json();
    view.delete();
    return json[0].scryfallId;
}

function tappedout_dom_to_json(board) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(board, "text/html");
    let json = [];
    for (const link of dom.querySelectorAll(".card-link")) {
        const qty = parseInt(link.parentElement.parentElement.childNodes[0].nodeValue);
        let group = link.parentElement.parentElement.parentElement.parentElement.children[0];
        group = group.tagName === "H3" ? group.textContent.trim().replace(/\w*?\([0-9]+?\)$/g, "") : "-";
        const name = link.textContent;
        console.log(`${qty}x of card ${name}`);
        json.push({Name: name, Qty: qty, Group: group});
    }
    return json;
}

export async function download_tappedout_json(name) {
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
    return tappedout_dom_to_json(json.board);
}

async function add_row_to_deck(table, new_deck, row) {
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

export async function tappedout_json_to_arrow(dialog, table, deck_buffer, data) {
    return await with_table(deck_buffer.slice(), {index: "uuid"}, async new_deck => {
        const json = await with_table(data, new_table => {
            return with_view(new_table, view => view.to_json())
        });

        let n = 0;
        for (const row of json) {
            await add_row_to_deck(table, new_deck, row);
            dialog.set_progress(n++, json.length);
        }

        return await with_view(new_deck, view => view.to_arrow());
    })
}

function get_url(sym_array, symbol) {
    return sym_array.find(x => x.symbol === symbol).svg_uri;
}

const URI_CACHE = {};
const CODE_CACHE = {};

export function mana_cost_to_svg_uri(sym_array, cost_code) {
    if (cost_code in CODE_CACHE) {
        return CODE_CACHE[cost_code];
    }

    let result = ``;
    let symbol = cost_code.slice(0, 1);
    cost_code = cost_code.slice(1);
    while (cost_code.length > 0) {
        while (!symbol.endsWith("}") && cost_code.length > 0) {
            symbol += cost_code.slice(0, 1);
            cost_code = cost_code.slice(1);
        }
        const icon = URI_CACHE[symbol] = URI_CACHE[symbol] || get_url(sym_array, symbol);
        result += `<img src="${icon}"></img>`;
        symbol = "";
    }

    CODE_CACHE[cost_code] = result;
    return result || "-";
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

export async function save_deck(deck) {
    await with_view(deck, {}, async view => {
        const arrow = await view.to_arrow();
        localStorage.setItem("deck", ab2str(arrow));
    });
}

export function load_deck(deck) {
    if (localStorage.getItem("deck")) {
        deck.update(str2ab(localStorage.getItem("deck")));
    }
}
