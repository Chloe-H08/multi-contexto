# Multi Contexto

An unlimited Contexto-style word game where every guess applies to two hidden words at the same time.

Contexto ranks guesses by semantic similarity using a small semantic sentence embedding model. This version uses one noun bank: every valid guess is a noun in that bank, every answer comes from that same bank, and every rank is fixed against the full bank.

Current packed bank size: about 6,000 noun entries.

Play it here: https://multi-contexto.vercel.app

## How Ranking Works

- `data/embeddings/manifest.js` and `data/embeddings/chunk-*.js` contain the valid noun list and packed embeddings.
- At the start of a round, the browser picks two target words.
- For each target, the browser ranks every noun by cosine similarity to the target.
- A guess is accepted only if it exists in the noun bank.
- The closest word is rank `#1`; lower ranks are closer.
- The rank is the guessed noun's fixed position in the ranked noun bank.

## Current Features

- Two simultaneous Contexto boards
- Shared guesses with independent ranks for Game A and Game B
- Unlimited rounds
- Hints that reveal a closer unguessed word
- Give-up controls per board
- Packed, chunked noun embeddings in `data/embeddings/`
- Responsive layout with an animated semantic-field canvas
