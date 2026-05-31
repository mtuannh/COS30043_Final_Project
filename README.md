# NovaTech Store



Vue 3 + Vite storefront with Express/MongoDB for local dev, and a bundled PHP API for **Mercury** deploy.



## Local development



```bash

npm install

npm run dev

```



Open `http://localhost:5173` — API at `http://localhost:3001/api`.



Copy `.env.example` → `.env` and fill in MongoDB + SMTP (same file is used when you build for Mercury).



Demo admin: `admin@novatech.test` / `Password123`



## Deploy to Mercury (3 steps)



1. **`npm run build`** in your IDE (uses `.env` to embed API config into `dist/api/config.php`).

2. Upload **everything inside `dist/`** to Mercury `htdocs` (WinSCP).

3. Open your Mercury URL — it should end with `#/` (e.g. `.../project/#/`). If you only see a 404 page, add `#/` to the URL or rebuild and re-upload.



No Composer, Render, or extra config files on the server.



Production URLs use hash routing (`#/products`). The API uses `api.php` next to `index.html`.

**Test after upload:** `https://mercury.swin.edu.au/<your-path>/api.php?route=/api/ping` → should show `"ok":true` and `"mongodb":true`.

Mercury needs **PHP 7.4+** with the **MongoDB extension** (ask Feenix if the ping test fails).



## Requirement mapping



See course brief — Vue 3, Bootstrap, 10+ pages, auth, CRUD, likes, chat, discount wheel, MongoDB persistence.


