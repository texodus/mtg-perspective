/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

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
                    <p>Upload a CSV file by dragging from your desktop and dropping onto the dashed region.</p>
                    <p>(Data is processed in browser, and never sent to any server).</p>
                    <input type="file" id="fileElem" multiple accept="text/csv">
                    <label class="button" for="fileElem">Select a file</label>
                </form>
            </div>`;

        const dropArea = this.querySelector("#drop-area");
        const input = this.querySelector("#fileElem");

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
