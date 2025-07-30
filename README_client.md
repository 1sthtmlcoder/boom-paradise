# BoomTown — GitHub Pages Client

Put the **contents** of this `client/` folder at the root of your GitHub Pages repo (or in `/docs` if you prefer that Pages setting).

## Before you publish
1. Download the Photon JS SDK (`Photon-Javascript_SDK.min.js`) and put it in `vendor/`.
2. Open `index.html` and **uncomment** the Photon SDK `<script>` tag.
3. Set your server URL:
   - EITHER edit it in code by replacing the placeholder in the obfuscated config (advanced),
   - OR simply open the browser console and run:
     ```js
     localStorage.setItem('API_BASE', 'https://your-server.onrender.com');
     ```

## PlayFab
- Title ID is already embedded (obfuscated). Upload `playfab_catalog.json` to your PlayFab **main** catalog and define currency **BC**.
