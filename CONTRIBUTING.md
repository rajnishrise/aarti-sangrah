# Contributing texts

Thank you for helping. Accuracy matters more than speed: every text should be checked against a printed edition, and only public-domain texts can be added. Film songs and modern bhajans are copyrighted, so they can’t be included.

## The text format

One file per text, at `content/<kind>/<id>.txt`, where kind is `aarti`, `chalisa`, `stotra`, `mantra` or `bhajan`. The header comes first, then the verses.

```
id: om-jai-jagdish-hare
kind: aarti
deity: vishnu
lang: hi
language: Hindi
region: North India
title: ॐ जय जगदीश हरे | Om Jai Jagdish Hare | Aarti of Shri Vishnu
author: Pandit Shardha Ram Phillauri, around 1870 | known
occasions: daily, satyanarayan, diwali
when: When and where it is sung.
notes: Known wording differences between editions. (optional)
source: The printed edition you checked against. (optional, but please add it)
refrain-first: yes

--- refrain
ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे।
~ Om jai Jagdish hare, Swami jai Jagdish hare,
= Om, glory to you, Hari, Lord of the universe!

---
जो ध्यावे फल पावे, दुःख बिनसे मन का।
~ Jo dhyave phal pave, dukh binse man ka.
= Whoever meditates on you receives the fruit, and sorrow leaves the mind.
```

- `---` starts a block. `--- refrain` marks the refrain; any other word after `---` (such as `--- दोहा`) becomes the block’s label. Blocks with no label are numbered automatically.
- Lines with no prefix are Devanagari. Lines starting `~ ` are the Roman version, one per Devanagari line. A line starting `= ` is the English meaning.
- `author` ends with `known` (historically documented), `attributed` (credited, usually by a signature line) or `traditional` (author unknown).
- `deity` and `occasions` must exist in `content/core.json`. Add new ones there.
- Optional headers: `form` (a display label such as Stuti or Ashtakam) and `dialect`.

## Granths

A granth lives in `content/granth/<id>/`. `index.txt` has the usual header plus one line per chapter:

```
chapter: 12 | भक्तियोग | Bhakti Yog | The yoga of devotion | 20
```

Each chapter file (`12.txt`) starts with `chapter: 12` and an optional `intro:` line, followed by its verses. Verses are numbered १२.१, १२.२ and so on. A line starting `> ` names the speaker, as in `> अर्जुन उवाच | Arjun said`. The build checks that the number of verses matches the index.

## Paintings

Deity paintings must be public domain. Add them to the deity in `content/core.json` with the Wikimedia Commons thumbnail URL, the file page, a caption, the artist, and `pos`, the part of the image to keep in view (for example `50% 20%` keeps the upper middle).

## Before you commit

Run `python tools/build.py`. It lists errors (which stop the build) and warnings (such as a missing meaning). Commit the `content/` change and the rebuilt `data/library.js` together.
