# ABVC Training Course

This is a static, data-driven course app. It has no backend, no login, and no build step.

## Run Locally

From this folder:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Edit The Course

Update `course-data.json`.

- Folders use `"type": "module"` and can contain nested `"children"`.
- Video lessons use `"type": "lesson"`.
- Add YouTube videos by setting `"status": "ready"`, `"provider": "youtube"`, `"youtubeUrl": "https://www.youtube.com/shorts/YOUR_VIDEO_ID"`, and `"videoId": "YOUR_VIDEO_ID"`.
- Lessons without a public YouTube link should stay visible with `"status": "coming_soon"`.
- Use `"category"` and `"subcategory"` for the student-facing course structure. `"sourceFolder"` is only internal history from the original production folders.
- Add Frame.io or other fallback links by setting `"videoUrl": "https://..."`.
- `course-validation-report.json` summarizes total lessons, ready lessons, coming-soon lessons, category counts, unmatched URL rows, and duplicate titles.

## Hosting

This folder can be hosted on any static host, including Cloudflare Pages, GitHub Pages, Netlify, or Vercel.

For video hosting, YouTube unlisted/public is the best free-at-scale option. Frame.io is useful for review/source links, but its free plan is storage-limited, so it should not be the main public course video host.
