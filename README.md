# ASAY PIKOL CLUB — Website

Multi-page pickleball club site with a GSAP + three.js scroll experience, an owner admin panel, and Google Sheets as the database.

## Pages
`index.html` Home · `about.html` About · `schedule.html` Schedule + reservations · `announcements.html` News · `contact.html` Contact · `admin.html` Owner area (not linked in the menu, only a small "Owner login" link in the footer; hidden from search engines).

## 1. Try it right now (demo mode)
Open `index.html` in a browser (or serve the folder: `npx serve` / `python3 -m http.server`). With `apiUrl` empty in `assets/js/config.js` the site uses sample data, and admin changes are saved only in your browser. Any passcode works in demo mode.

## 2. Connect Google Sheets (real data)
1. Create a new Google Sheet. **Extensions → Apps Script**. Delete the sample code and paste `apps-script/Code.gs`.
2. **Project Settings (gear) → Script properties → Add**:  
   `ADMIN_PASSCODE` = a strong passcode only the owner knows  
   `OWNER_EMAIL` = (optional) email that gets notified of reservations / messages.
3. Select the `setup` function → **Run** → accept permissions. This creates the tabs *Schedule, Announcements, Reservations, Messages*.
4. **Deploy → New deployment → Web app** · Execute as **Me** · Who has access **Anyone** → Deploy → copy the **Web app URL**.
5. Paste it into `assets/js/config.js` → `apiUrl: "https://script.google.com/macros/s/…/exec"`.
6. Whenever you change the script, use **Deploy → Manage deployments → Edit → New version**.

The owner can now go to `/admin.html`, enter the passcode and add/edit/delete schedule sessions and announcements, view reservations and messages. They can also edit the Google Sheet directly; the website reads it live.

### Sheet tabs
| Tab | Columns |
|---|---|
| Schedule | id, type (Weekly / One-time), day, date, start (HH:mm), end, title, level, location, slots, fee, notes, status (Open / Full / Cancelled / Hidden) |
| Announcements | id, title, category, date (YYYY-MM-DD), pinned (yes / blank), body, status (Published / Draft) |
| Reservations | filled by the website form |
| Messages | filled by the contact form |

## 3. Background videos
Drop `.mp4` / `.webm` clips into `assets/videos/` and list them in `config.js → videos`. They cross-fade as visitors scroll (any pickleball footage works; free sources: Pexels, Pixabay, Mixkit; keep each under ~8 MB, 720p). If no video loads, the built-in animated 3D court is used automatically.

## 4. Edit your details
Everything editable (club contact, socials, map, logo, videos) lives in `assets/js/config.js`.
Replace the contact placeholders (email, phone, address) before publishing.

## 5. Publish
Upload the whole folder to GitHub Pages, Netlify, Cloudflare Pages or any static host. Point your domain at it.

## Tech
GSAP 3 + ScrollTrigger, three.js r128, Lenis smooth scroll, Font Awesome 6, Google Apps Script. All loaded from CDNs; no build step.
