# Website content guide

Use lowercase English filenames with hyphens. Include the year and program when a file belongs to a particular experience.

## Recommended structure

```text
index.html
programs/
  summer-2025.html
  sandwich-2026.html
assets/
  images/
    profile/
    summer-2025/
    sandwich-2026/
  documents/
    cv/
    summer-2025/
    sandwich-2026/
styles/
  main.css
scripts/
  main.js
```

The current site can be migrated gradually. Do not move every existing file at once, because old links may break. Put new files into the recommended folders and migrate older files when their pages are next edited.

## Naming examples

- `sandwich-2026-project-proposal.pdf`
- `sandwich-2026-progress-2026-09.pdf`
- `sandwich-2026-light-curve-result-01.png`
- `summer-2025-bonn-talk.pdf`
- `wing-chen-cv-2026.pdf`

Avoid spaces, non-English punctuation, and generic names such as `future.pdf`, `results2.pdf`, or `Final.pdf`.

## Updating the Sandwich Program

1. Add a new image or PDF under `assets/images/sandwich-2026/` or `assets/documents/sandwich-2026/`.
2. Give it a descriptive, dated filename.
3. Add the newest milestone to **Current Progress** in `sandwich.html`.
4. When a planned item is completed, move its description from **Next Steps** to **Current Progress**.
5. Check the page locally, then commit and push the changes.

## Version-control routine

```bash
git pull origin main
git add .
git commit -m "Update Sandwich Program progress for YYYY-MM"
git push origin main
```
