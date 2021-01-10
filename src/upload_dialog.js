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
            <style>${STYLE}</style>
            <div id="drop-area" class="loading">
                <h3>Loading <code>${name}</code></h3>
            </div>`;
    }

    load_txt(txt) {
        this.dispatchEvent(new CustomEvent("upload-event", {detail: txt}));
        this.innerHTML = `
        <style>${STYLE}</style>
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
            <style>${STYLE}</style>
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
        dropArea.addEventListener("drop", x => console.log(x), false);

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

const STYLE = `

#drop-area {
    position: relative;
    border: 5px dashed #ccc;
    background-color: white;
    width: 480px;
    font-family: sans-serif;
    margin: 100px auto;
    padding: 48px;
    color: #666;
}

#drop-area.loading {
    border: 5px solid #fff;
}

#drop-area.highlight {
    border-color: cornflowerblue;
    color: #000;
}

#loading {
    position: relative;
    width: 480px;
    height: 10px;
    border: 1px solid #eee;
    border-radius: 15px;
}

#progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 10px;
    width: 0px;
    border-radius: 15px;
    background: linear-gradient(to right, #d38312, #a83279);
}

p {
    margin-top: 0;
}

.my-form {
    margin-bottom: 10px;
}

#gallery {
    margin-top: 10px;
}

#gallery img {
    width: 150px;
    margin-bottom: 10px;
    margin-right: 10px;
    vertical-align: middle;
}

.my-form .button {
    font-family: "Open Sans";
    font-size: 14px;
    display: inline-block;    
    background: #ccc;
    cursor: pointer;
}

.my-form .button:hover {
    background: cornflowerblue;
    color: white;
}

#fileElem {
    display: none;
}

perspective-viewer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
}`;