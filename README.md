# आरती संग्रह · Aarti Sangrah

A library of Hindu devotional texts: aartis, chalisas, stotras, mantras, bhajans and the Bhagavad Gita. Every text has the Devanagari, a singable Roman version and an English meaning for each verse, along with its deity, the occasions it is sung on, its author and known variants.

> **Status:** 30 texts. They have not yet been proofread against printed editions; please [report mistakes](https://github.com/rajnishrise/aarti-sangrah/issues).

## What it does

- **Today:** the day’s deity and texts, and a countdown to the next festival
- **Deity pages:** a painting of each deity in a temple arch, with all of their texts
- **The library:** aarti, chalisa, stotra, mantra, bhajan and granth, browsable by deity, occasion, weekday and language
- **Search** that tolerates loose spellings (*jagdish*, *jagadeesh*), other names (*Bajrangbali*, *Bholenath*) and half-remembered lines, opening the text at that verse
- **Reader:** Devanagari, Roman or both; meanings on or off; adjustable text size; light and dark; print layout
- **Puja mode:** large text, one verse lit at a time, screen kept awake, and an “Offer flowers” shower of petals at the end
- **My puja:** a saved running order of texts, with presets such as Diwali Lakshmi Puja and Morning prayers
- **Bhagavad Gita:** read chapter by chapter, with the speaker of each verse

## How it is organised

| Path | What it holds |
|---|---|
| `index.html` | Page shell and the SVG flowers (marigold, lotus, petal) |
| `assets/site.css`, `assets/app.js` | Styles and the app itself; no framework, no build step for code |
| `content/core.json` | Deities and their paintings, categories, occasions, weekdays, festival dates, puja presets |
| `content/<kind>/<id>.txt` | One text per file, in a simple plain-text format |
| `content/granth/<id>/` | `index.txt` plus one file per chapter |
| `tools/build.py` | Checks every text and compiles `data/library.js` |
| `data/library.js` | Generated; don’t edit by hand |

## Adding or correcting a text

Edit or add a file in `content/` (the format is in [CONTRIBUTING.md](CONTRIBUTING.md)), then run:

```
python tools/build.py
```

It reports any problems and rewrites `data/library.js`. Commit both. A GitHub Action runs the same check on every push.

## Running and publishing

Open `index.html` in a browser; no server is needed. The site is published with GitHub Pages from the `main` branch.

## Credits

The paintings are public-domain works, most by Raja Ravi Varma (1848–1906) and the Ravi Varma Press, loaded from Wikimedia Commons; the site’s Image credits page links to each one. The marigolds, lotuses and arches are original artwork. The texts are traditional and in the public domain; the Roman versions and English meanings were written for this project.

See [ROADMAP.md](ROADMAP.md) for what comes next.
