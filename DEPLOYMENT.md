# Deployment guide

This app is a static website and can be published to GitHub Pages for free.

## Steps

1. Create a GitHub repository for this folder.
2. Push the contents of this folder to the repository.
3. In GitHub, open Settings → Pages.
4. Choose GitHub Actions as the source.
5. The workflow in [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) will publish the site automatically on every push to the main branch.

## Notes

- The app is privacy-safe because form data stays in the browser.
- Staff should use the published URL and not a local file.
- Updates publish automatically after each push to main.
