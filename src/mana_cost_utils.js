/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

function get_url(sym_array, symbol) {
    return sym_array.find(x => x.symbol === symbol).svg_uri;
}

const URI_CACHE = {};
const CODE_CACHE = {};

function get_svg(sym_array, cost_code) {
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

export async function manaStyleListener(sym_array, _) {
    for (const td of this.querySelectorAll("td")) {
        const meta = this.getMeta(td);
        const col_name = meta.column_header[meta.column_header.length - 1];
        if (col_name === "manaCost") {
            td.innerHTML = get_svg(sym_array, meta.value);
        } else if (col_name.includes("color")) {
            td.innerHTML = td.innerText
                .replace("B", `<span class="mcolor" style="background-color:#333">B</span>`)
                .replace("U", `<span class="mcolor" style="background-color:#1f78b4">U</span>`)
                .replace("G", `<span class="mcolor" style="background-color:#33a02c">G</span>`)
                .replace("W", `<span class="mcolor" style="background-color:white;color:#999">W</span>`)
                .replace("R", `<span class="mcolor" style="background-color:#e31a1c">R</span>`);
        }
        td.classList.toggle("alt", meta.y % 2);
    }
}