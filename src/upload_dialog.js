/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import "./upload_dialog.css";
import {download_tappedout_json} from "./data_service_utils.js";

class UploadDialog extends HTMLElement {

    constructor() {
        super();
        this.uploadFile = this.uploadFile.bind(this);
        this.addEventListener("click", event => {
            if (event.target === this && !this.classList.contains("loading")) {
                this.parentElement.removeChild(this);
            }
        });
    }

    _set_loading(name) {
        this.innerHTML = `
            <div id="drop-area" class="loading">
                <h3>Loading <code>${name}</code></h3>
            </div>`;
    }

    async load_tappedout_id(name) {
        this._set_loading(name);
        const json = await download_tappedout_json(name);
        this.load_txt(json);
    }

    load_txt(txt) {
        this.dispatchEvent(new CustomEvent("upload-event", {detail: txt}));
        this.innerHTML = `
            <div id="drop-area" class="loading">
                <div id="loading">
                    <div id="progress"></div>
                </div>
            </div>`;
    }

    uploadFile(file) {
        let reader = new FileReader();
        reader.onload = fileLoadedEvent => {
            let txt = fileLoadedEvent.target.result;
            this.load_txt(txt);
        };
        reader.readAsText(file);
    }

    connectedCallback() {
        if (this.innerHTML.trim().length !== 0) {
            return;
        }

        this.innerHTML = `
            <div id="drop-area">
                <form class="my-form">
                    <p>Upload a Deck List CSV file by dragging from your desktop and
                    dropping onto the dashed region.  Deck List CSVs must provide
                    <code>[Nn]ame</code> and optionally <code>[Qq]ty|[Cc]ount</code>
                    columns.  Data is processed in-browser, and never sent to any
                    server.</p>
                    <input type="file" id="fileElem" multiple accept="text/csv">
                    <label class="button" for="fileElem">Select a file</label>
                    <br/>
                    <br/>
                    <b><i>or</i></b>
                    <br/>
                    <br/>
                    <p>Import via deck name from</p>
                    <code style="font-size:16px">https://tappedout.net/mtg-decks/</code>
                    <input type="text" id="textElem" placeholder="Deck List Name"></input>
                </form>
            </div>`;

        const dropArea = this.querySelector("#drop-area");
        const input = this.querySelector("#fileElem");
        const form = this.querySelector(".my-form");
        form.addEventListener("submit", event => {
            event.preventDefault();
            event.stopPropagation();
            const input = this.querySelector("#textElem");
            const name = input.value.toString().trim();
            window.history.replaceState(null, null, `?${name}`);
            this.load_tappedout_id(name);
        })

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function highlight() {
            dropArea.classList.add("highlight");
        }

        function unhighlight() {
            dropArea.classList.remove("highlight");
        }

        const handleFiles = (files) => {
            [...files].forEach(this.uploadFile);
        }

        const handleDrop = (e) => {
            handleFiles(e.dataTransfer.files);
        }

        ["dragenter", "dragover"].forEach(function(eventName) {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ["dragleave", "drop"].forEach(function(eventName) {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        dropArea.addEventListener("dragenter", () => {}, false);
        dropArea.addEventListener("dragleave", () => {}, false);
        dropArea.addEventListener("dragover", () => {}, false);
        dropArea.addEventListener("drop", x => {}, false);

        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        dropArea.addEventListener("drop", handleDrop, false);
        input.addEventListener("change", function() {
            handleFiles(this.files);
        });
    }

    set_progress(n, d) {
        this.querySelector("#progress").style.width = `${Math.floor(480 * n / d)}px`;
    }

    set_scryfall_id(id) {
        const url = `https://c1.scryfall.com/file/scryfall-cards/large/front/${id[0]}/${id[1]}/${id}.jpg?1562404626`;
        this.innerHTML = ` <img id="preview" src="${url}"></img>`;
    }
}

window.customElements.define('upload-dialog', UploadDialog);
