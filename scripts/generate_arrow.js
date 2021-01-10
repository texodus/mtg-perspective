/******************************************************************************
 *
 * Copyright (c) 2021, the `mtg-perspective` Authors.
 *
 * This file is part of the `mtg-perspective` library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const perspective = require("@finos/perspective");

const fs = require("fs");
const https = require('https');
const { mainModule } = require("process");

function inferSchema(card) {
    const schema = {
        name: undefined,
        manaCost: undefined,
        convertedManaCost: undefined,
        types_0: undefined,
        colorIdentity_0: undefined
    };
    const accessors = {}
    for (const field of Object.keys(card)) {
        const value = card[field];
        if (typeof value === "string") {
            schema[field] = "string";
            accessors[field] = card => card[field] || "-";
        } else if (typeof value === "number") {
            schema[field] = "integer";
            accessors[field] = card => card[field] || null;
        } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i ++) {
                let frozen_i = i;
                schema[`${field}_${i}`] = "string";
                accessors[`${field}_${i}`] = card => card[field] ? card[field][frozen_i] || "-" : "-";
            }
        } else {
            console.warn(`Dropping column "${field}" from ${JSON.stringify(card[field])}` );
        }
    }
    return {schema, accessors};
}

function download_json(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                resolve(data);
            });
        }).on("error", reject);
    });
}

async function main() {
    if (!fs.existsSync("data")) {
        fs.mkdirSync("data");
    }

    if (!fs.existsSync("data/AllIdentifiers.json")) {
        const json = await download_json(`https://mtgjson.com/api/v5/AllIdentifiers.json`);
        fs.writeFileSync("data/AllIdentifiers.json", json);
    }

    const buffer = require("../data/AllIdentifiers.json");
    let {schema, accessors} = inferSchema(buffer.data[Object.keys(buffer.data)[0]]);

    schema["scryfallId"] = "string"
    accessors["scryfallId"] = card => card.identifiers.scryfallId;

    const table = perspective.table(schema, {index: "uuid"});
    
    let rows = [];
    for (const uuid of Object.keys(buffer.data)) {
        const card = buffer.data[uuid];
        const row = {};
        for (const field of Object.keys(schema)) {
            try {
                row[field] = accessors[field](card);
            } catch (e) {
                console.error(field);
                throw e;
            }
        }
        rows.push(row);
        if (rows.length > 100) {
            table.update(rows);
            rows = [];
        }
    }

    table.update(rows);
    const arrow = await table.view().to_arrow();
    fs.writeFileSync("./data/all_identifiers.arrow", Buffer.from(arrow), "binary");

    schema = {name: "string", count: "integer", ...schema};
    const deck_table = perspective.table(schema);
    const arrow2 = await deck_table.view().to_arrow();
    fs.writeFileSync("./data/deck.arrow", Buffer.from(arrow2), "binary");


    if (!fs.existsSync("data/symbology.json")) {
        const json = await download_json(`https://api.scryfall.com/symbology`);
        fs.writeFileSync("data/symbology.json", json);
    }

    const json2 = require("../data/symbology.json");
    const symbology = perspective.table(json2.data, {index: "symbol"});
    const arrow3 = await symbology.view().to_arrow();
    fs.writeFileSync("./data/symbology.arrow", Buffer.from(arrow3), "binary");
}

main();





