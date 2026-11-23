# Working on Ukulele Starter

- Edit `site/`. `scripts/build.js` generates `dist/` and the versioned
  service worker from `scripts/sw.js`.
- Add chords and practice songs in `site/content.js`. Keep chord and song keys
  stable for bookmarked URLs. Tuning, chord diagrams, and song arrangements should
  agree with the string and chord data there.
- Keep microphone processing local. Test tuning or audio changes in a browser
  on HTTPS or localhost, where microphone and service worker APIs are available.
- Use Node.js 24 or newer. Run `npm run check`, `npm run build`, and
  `node .github/site-smoke.mjs dist --assets-only`. Preview the build with
  `python3 -m http.server 8000 --directory dist`.
- Make changes to shared deployment helpers in their canonical repo as
  described in Origami's README.
