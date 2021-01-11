/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import {scryfall_id_to_img_url, uuid_to_scryfall_id} from "./data_service_utils.js";

const EMPTY_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function _validate() {
    this.children[0].classList.remove("invalid");
    this.children[0].removeEventListener("load", this._validate);
}

class CardDetails extends HTMLElement {
    connectedCallback() {
        this._validate = _validate.bind(this);
        this.clear();
    }

    clear() {
        this.innerHTML = `<img id="preview" src="${EMPTY_DATA_URI}" class="invalid"></img>`;
    }

    set_invalid() {
        this._uuid = undefined;
        this.children[0].classList.add("invalid");
        this.children[0].setAttribute("src", EMPTY_DATA_URI);
    }

    has_uuid() {
        return this._uuid !== undefined;
    }

    get_uuid() {
        return this._uuid;
    }

    async set_uuid(id) {
        this.set_invalid();
        this._uuid = id;
        const scryfall_id = await uuid_to_scryfall_id(this._uuid)
        const url = scryfall_id_to_img_url(scryfall_id);
        this.innerHTML = `<img id="preview" src="${url}" class="invalid"></img>`;
        this.children[0].addEventListener("load", this._validate);
    }
}

window.customElements.define('card-details', CardDetails);