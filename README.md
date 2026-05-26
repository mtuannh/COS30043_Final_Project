# NovaTech Store

NovaTech Store is an Apple-inspired ecommerce web application for COS30043 Interface Design and Development. It uses Vue 3, Vite, Vue Router, Bootstrap, and a small Express REST API backed by `server/db.json`.

## Run Locally

```bash
npm install
npm run start
```

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:3001/api`.

Demo admin account:

- Email: `admin@novatech.test`
- Password: `Password123`

## Requirement Mapping

- Vue 3 with Vite: implemented in `src/main.js` and `vite.config.js`.
- Bootstrap grid and responsive design: Bootstrap is imported globally and used throughout all views.
- 10+ interconnected pages: home, products, product detail, cart, login, register, profile, admin, create/edit product, about, contact, and not found.
- Collection display and detail pages: products list and product detail routes.
- Search, sort, and pagination: catalogue filters in `ProductsView.vue`.
- Registration and login: auth endpoints and guarded profile/admin routes.
- Different visibility for authenticated users: profile/admin links and route guards require login.
- CRUD: create, edit, delete products in the admin area through the REST API.
- Social interaction: users can like products, and likes persist in the database.
- Persistent data: product, user, like, and contact data are stored in `server/db.json`; cart and session are stored in local storage.
- Form validation: login, registration, product editor, and contact forms validate user input.

## Suggested Advanced Feature

For the final submission, add a product comparison assistant with saved comparison boards. This would be a meaningful Vue-focused advanced feature because it can demonstrate reusable components, computed comparison data, local/API persistence, and a strong usability improvement.
