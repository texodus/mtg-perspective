/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

// `<card-details>` Web Component

const EMPTY_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function to_img_url(scryfall_id) {
    return `https://c1.scryfall.com/file/scryfall-cards/large/front/${scryfall_id[0]}/${scryfall_id[1]}/${scryfall_id}.jpg?1562404626`
}

async function uuid_to_scryfall_id(uuid) {
    const all_cards = document.body.querySelector("#all_cards");
    console.log(uuid)
    const view = all_cards.table.view({
        filter: [["uuid", "==", uuid]],
        columns: ["scryfallId"]
    });
    const json = await view.to_json();
    view.delete();
    return json[0].scryfallId;
}

class CardDetails extends HTMLElement {
    connectedCallback() {
        this._validate = this._validate.bind(this);
        this.clear();
    }

    clear() {
        this.innerHTML = `<img id="preview" src="${EMPTY_DATA_URI}" class="invalid"></img>`;
    }

    set_invalid() {
        this._uuid = undefined;
        this.children[0].classList.add("invalid");
    }

    _validate() {
        this.children[0].classList.remove("invalid");
        this.children[0].removeEventListener("load", this._validate);
    }

    has_uuid() {
        return this._uuid !== undefined;
    }

    get_uuid() {
        return this._uuid;
    }

    async set_uuid(id) {
        this._uuid = id;
        const scryfall_id = await uuid_to_scryfall_id(this._uuid)
        const url = to_img_url(scryfall_id);
        this.innerHTML = `<img id="preview" src="${url}"></img>`;
        this.children[0].addEventListener("load", this._validate);
    }
}

window.customElements.define('card-details', CardDetails);