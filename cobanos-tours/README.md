# Los Cóbanos Tours Site

Static site for cobanos-tours. Deployed to:
- Own repo: https://cashforclankers.github.io/cobanos-tours/
- Code lives here for unified local management with elsalkb-site.

To push updates, sync changes back to the cobanos-tours repo:
```bash
rsync -av cobanos-tours/ ../cobanos-tours/ --exclude README.md
cd ../cobanos-tours && git add -A && git commit -m "update" && git push
```
