# Ukulele Starter

Repository: `ukulele-first-strum`. The product name in the UI stays **Ukulele Starter**.

A beginner-friendly ukulele practice app. Tune the four strings, learn chords with fingering diagrams and audio, and practice traditional songs and a chord-change exercise. Lesson progress stays in the current browser. The tuner processes microphone audio on the device.

Use **Copy chord link** or **Copy song link** to open that selection directly from a bookmark or message.

## Check, build, and preview

Use Node.js 26 and Python 3. The site has no npm dependencies.

```sh
npm run check
npm run build
python3 -m http.server 8000 --directory dist
```

The Pages workflow runs the deployment smoke test against `dist/`. Run `node .github/site-smoke.mjs dist --assets-only` to check the offline file list locally.

Open [http://localhost:8000](http://localhost:8000). The microphone and service worker require HTTPS or localhost.

The Pages workflow also tests leaving the tuner while microphone permission is
pending. To run that test locally after building, set `PLAYWRIGHT_MODULE` to the
absolute path of an installed `playwright/index.mjs`, then run
`npm run test:browser`. It uses Chromium and simulates permission and stream
cleanup without a physical microphone.

## Deploy to GitHub Pages

In **Settings → Pages**, select **GitHub Actions** as the publishing source. The workflow checks pull requests and deploys the contents of `dist/` on pushes to `main`. It can also be run manually from `main`. The workflow run shows the deployed URL.

## Practice offline

Open the site online once and wait for “Ready for offline practice” under **Install for offline practice**. Chromium browsers may offer installation from the address bar or menu. On iPhone or iPad, open the site in Safari and choose **Share → Add to Home Screen**.

After a deployment, the existing version finishes the current session. Once its open tabs and app windows are closed, the new version can take over without clearing lesson progress.

## Content

The song sheets use original beginner-friendly chord arrangements of traditional songs, including “Frère Jacques” and “Twinkle, Twinkle, Little Star.” The exercise and lesson text were written for this app.
