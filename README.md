# Ukulele Starter

A beginner-friendly ukulele practice app. Tune the four strings, learn five common chords, and practice two traditional songs and a chord-change exercise. Lesson progress stays in the current browser. The tuner processes microphone audio on the device.

## Run locally

Use Node.js 24 or newer. There are no dependencies to install.

```sh
npm test
npm run build
python3 -m http.server 8000 --directory dist
```

Open [http://localhost:8000](http://localhost:8000). The microphone and service worker require HTTPS or localhost.

## Deploy to GitHub Pages

In **Settings → Pages**, select **GitHub Actions** as the publishing source. The workflow checks pull requests and deploys the contents of `dist/` on pushes to `main`. It can also be run manually from `main`. The workflow run shows the deployed URL.

## Practice offline

Open the site online once and wait for “Ready for offline practice” under **Install for offline practice**. Chromium browsers may offer installation from the address bar or menu. On iPhone or iPad, open the site in Safari and choose **Share → Add to Home Screen**.

After a deployment, the existing version finishes the current session. Once its open tabs and app windows are closed, the new version can take over without clearing lesson progress.

## Content

The song sheets use original beginner-friendly chord arrangements of the traditional songs “Row, Row, Row Your Boat” and “Mary Had a Little Lamb.” The exercise and lesson text were written for this app.
