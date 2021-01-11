/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

 import {mana_cost_to_svg_uri} from "./data_service_utils.js";

export async function manaStyleListener(sym_array, _) {
    for (const td of this.querySelectorAll("td")) {
        const meta = this.getMeta(td);
        const col_name = meta.column_header[meta.column_header.length - 1];
        if (col_name === "manaCost") {
            td.innerHTML = mana_cost_to_svg_uri(sym_array, meta.value);
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