# Vitruvian Man Body Oracle

An interactive healing tool that maps body zones to spiritual and emotional meanings, integrating wisdom from chakra systems, Traditional Chinese Medicine, Louise Hay, Manly P. Hall, and German New Medicine.

**Live URL:** https://sherlockfit.github.io/index.html/

---

## Setup Instructions

### 1. Add the Vitruvian Man Image

Upload your Vitruvian Man image as `vitruvian-man.png` to the root of this repository.

The app will automatically display the image on the body map. If the image is not present, a CSS/SVG body silhouette fallback will be shown so the app works without it.

### 2. Deploy to GitHub Pages

1. Go to your repository on GitHub: https://github.com/sherlockfit/index.html
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Choose the `main` branch and `/ (root)` folder
5. Click **Save**
6. Your site will be live at: https://sherlockfit.github.io/index.html/

### 3. Embed in Squarespace via iframe

Add a **Code Block** to your Squarespace page and paste:

```html
<iframe src="https://sherlockfit.github.io/index.html/" width="100%" height="900" frameborder="0"></iframe>
```

### 4. Use the Admin Panel

The admin panel (`admin.html`) lets you add and edit custom ailments and spiritual meanings. Navigate to:

```
https://sherlockfit.github.io/index.html/admin.html
```

Use the forms to add custom ailment names, descriptions, and spiritual meanings. Data is stored in your browser's localStorage.

### 5. Customize Body Zone Data

Body zone data is stored in `body-data.js`. Each zone has the following fields:

- `name` — Display name
- `chakra` — Chakra association with color and element
- `tcm` — Traditional Chinese Medicine meridians and emotions
- `louiseHay` — Affirmations and emotional patterns
- `manlyPHall` — Esoteric significance
- `gnm` — German New Medicine conflict patterns
- `playbook` — Linked Playbook.io workout programs
- `healthIssues` — Common ailments and their emotional roots
- `affirmations` — Healing affirmations for this zone

Edit the entries in `body-data.js` to customize the content for any body zone.

### 6. Set Up Email Capture (Future)

Email capture via Mailchimp was removed from the current version since the integration is not yet configured. When you are ready to add it back:

1. Create a Mailchimp account and set up an audience
2. Get your Mailchimp form action URL from the **Embedded Forms** section in your audience dashboard
3. Add an email form to the `<header>` in `index.html`:
   ```html
   <form action="YOUR_MAILCHIMP_URL" method="post" id="email-capture">
     <label for="email">Subscribe for updates:</label>
     <input type="email" name="EMAIL" id="email" required>
     <button type="submit">Subscribe</button>
   </form>
   ```
4. Add a submit handler in `script.js` if you want custom handling beyond the default Mailchimp redirect

---

## Playbook.io Programs

The following Playbook.io programs are linked from relevant body zones:

- **General:** https://my.playbookapp.io/sherlockfit
- **Glutes:** https://my.playbookapp.io/sherlockfit/programs/glutes/42443
- **HIIT (Heart & Strength):** https://my.playbookapp.io/sherlockfit/programs/hiit/40861
- **Armory (Arms):** https://my.playbookapp.io/sherlockfit/programs/armory/42440
