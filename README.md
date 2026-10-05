# आरती संग्रह · Aarti Sangrah

A website of Hindu aartis: lyrics in Devanagari and Roman script, an English meaning for every verse, and notes on the deity, the occasions each aarti is sung on, its author and known variants.

> **Status: working prototype with ten sample aartis.** The texts have not been verified. Proofread every line against a printed edition, and record the edition used, before the site goes public.

## Features

- Search that tolerates loose Roman spellings (*jagdish*, *jagadeesh*), other names of the gods (*Bholenath*, *Bajrangbali*, *Ganpati*) and half-remembered lines from inside an aarti, which open the aarti at that verse
- Browse by deity, occasion, weekday and language, plus a list of saved aartis
- A home screen that follows the calendar: the day's traditional deity and a countdown to the next festival
- Reader with Devanagari, Roman or both, meanings on or off, compact or full refrains, adjustable text size, light and dark themes, and a print layout
- Puja mode for singing from a phone: larger text, one verse highlighted at a time, the Next button or arrow keys to move on, and the screen kept awake where the browser supports it
- My puja: a saved running order of aartis (with presets such as Diwali Lakshmi Puja) that plays one after another
- Shareable links to an aarti or a single verse, e.g. `#/aarti/om-jai-jagdish-hare/2`

## Running it

Everything is in one self-contained file. Open `index.html` in a browser; there is no build step and no server. Fonts load from Google Fonts, with system Devanagari fonts as the fallback offline.

## Publishing with GitHub Pages

In the repository, go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose your default branch (usually `main`) and `/ (root)`, and save. The site appears at `https://<username>.github.io/<repo>/` within a few minutes. Routing uses the URL hash, so no server configuration is needed.

On a free GitHub account, Pages only works for public repositories.

## Where the content lives

All data is in the `<script>` block of `index.html`:

| Constant | Holds |
|---|---|
| `AARTIS` | The aarti texts and their metadata |
| `DEITIES` | Deities with their other names in Roman and Devanagari, used by search |
| `OCC`, `OCC_ORDER` | Occasions and festivals, and the order they're listed in |
| `WEEKDAYS` | Each weekday's traditional deity and suggested aartis |
| `PRESETS` | Ready-made puja orders |
| `FESTS` | Festival dates for the home-screen countdown |

`FESTS` needs updating every year. Hindu festival dates follow the lunar calendar and can differ by a day between regions, so take them from one trusted panchang. The current table covers Navratri to Diwali 2026.

## Adding an aarti

Add an object to `AARTIS`. In every text field, `\n` separates the lines of a verse.

```js
{
  id: 'url-slug',                      // used in links: #/aarti/url-slug
  deity: 'ganesh',                     // an id from DEITIES
  type: 'aarti',                       // aarti | stuti | shloka
  lang: 'hi', language: 'Hindi', region: 'North India',
  title: { d: 'देवनागरी शीर्षक', r: 'Roman title', en: 'Aarti of …' },
  auth: { t: 'Who wrote it, and how we know', c: 'traditional' },  // known | attributed | traditional
  occ: ['diwali', 'daily'],            // ids from OCC
  when: 'When and where it is sung.',
  notes: 'Wording differences between editions.',
  refrainFirst: true,                  // does the refrain open the aarti? It repeats after every verse either way
  refrain: { d: '…', r: '…', m: '…' }, // or null if there is no refrain
  verses: [
    { d: 'Devanagari', r: 'Singable Roman', m: 'English meaning' }
  ]
}
```

To suggest it on a weekday or include it in a preset, add its `id` to `WEEKDAYS` or `PRESETS`.

## Privacy

Saved aartis and the puja order are stored in the browser's localStorage on the visitor's own device. The site has no backend of its own; the only outside requests are for Google Fonts.
