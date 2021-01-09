# mtg-perspective

A deck-builder and card screener for
[Magic: The Gathering](https://magic.wizards.com/en), built on
[Perspective](https://perspective.finos.org).

## Data

`mtg-perspective` runs entirely in the browser and does not need a server, but it does
rely on a few compile-time data dependencies and run-time Web Services:

* [`mtgjson`](https://github.com/mtgjson/mtgjson) for card reference data.
* [`scryfall`](https://scryfall.com/) for card images.
* [`tappedout`](https://tappedout.net/) for deck lists.

## Build Instructions

Install dependencies:

> yarn

Generate the initial database as an [Apache Arrow](https://arrow.apache.org/):

> yarn generate

Host locally

> yarn start