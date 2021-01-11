# mtg-perspective

A deck-builder and card screener for
[Magic: The Gathering](https://magic.wizards.com/en), built on
[Perspective](https://perspective.finos.org).

## Demo

[Demo at https://texodus.github.io/mtg-perspective/](https://texodus.github.io/mtg-perspective/?seasons-in-the-abyss-67).  You can quick-import a [`tappedout`]() list by adding it to
the URL's query string, e.g
[https://texodus.github.io/mtg-perspective/?seasons-in-the-abyss-67](https://texodus.github.io/mtg-perspective/?seasons-in-the-abyss-67).  Once loaded, `localStorage` will keep the
most recent deck state after browser refresh.

## Data

`mtg-perspective` runs entirely in the browser and does not need a server, but it does
rely on a few compile-time data dependencies and run-time Web Services:

* [`mtgjson`](https://github.com/mtgjson/mtgjson) for card reference data, which is
  encoded as an [Apache Arrow]() at compile time and downloaded along with the web app 
  bundle at runtime.
* [`scryfall`](https://scryfall.com/) for card images, which are loaded at runtime from
  [https://scryfall.com/](https://scryfall.com/) via their API.
* [`tappedout`](https://tappedout.net/) for deck lists, which are loaded and parsed at
  runtime from [https://tappedout.net/](https://tappedout.net/) via their API.

## Build Instructions

Install dependencies:

> yarn

Generate the initial database as an [Apache Arrow](https://arrow.apache.org/):

> yarn generate

Host locally

> yarn start