# Bicycle Spoke Calculator

## Demo page
GitHub pages: https://llongmane584.github.io/the-spoke-calculator/

[日本語](README_ja.md)

- A web application for (as accurately as possible) calculating spoke lengths required for bicycle wheel building.
- Assumes 12 mm nipples. If you want to be strictly accurate, you need to consider the rim's inner wall thickness and nipple length, so please modify the tool if you care about these details.
- If the calculations from this tool don't work out, please don't complain to the author - improve it yourself.
- Each parameter is based on what can be input from the [Hope Pro 5](https://www.hopetech.com/products/hubs/mountain-bike/pro-5-110mm-boost-front/) specification document.

## Development

Most of the code in this project was created with [Claude Code](https://claude.ai/code).

## Features

- **Precise spoke length calculation**: Uses common formulas combining cosine rule (planar) and Pythagorean theorem (3D).
  Both sides update live as you type — there is no Calculate button
- **Presets**: Fill the form from author-owned parts, picked from the chips next to each section heading
  - Whole wheel: Hope Pro 5 CL + Nextie Premium 29x36, Hope Pro 5 IS6 + Nextie Premium 29x36 and
    Hope Pro 5 IS6 + Stan's Flow MK4 29in, each as a front and a rear wheel (six in total)
  - Hub only / rim only: pick a hub and a rim separately to work out a wheel that has never been built
  - The chips mirror the current inputs — pick a wheel and the hub/rim chips light up on their own;
    edit a field by hand and the chips that no longer match go quiet
- **Rich input parameters**:
  - ERD (Effective Rim Diameter)
  - Rim offset (automatically applied to reduce the effective left/right flange-distance difference)
  - Left and right hub flange PCD (Pitch Circle Diameter)
  - Distance between left and right flanges
  - Spoke hole diameter
  - Number of spokes (24, 28, 32, 36)
  - Lacing pattern for both sides (0-4 cross)
- **Validation and warnings**: every field is range-checked while you type. The rim offset also warns when the
  entered amount would widen the left/right difference instead of narrowing it, and when both flange distances
  are equal so the direction cannot be worked out (in which case the offset is not applied)
- **Inline help**: the (?) beside a label opens an explanation of that dimension, with an SVG diagram for
  ERD, flange distance, spoke hole diameter and crossings
- **Docking result band**: while its own place is still below the fold, the results band sticks to the bottom
  of the screen and shrinks down to the two numbers, then grows back into place as you scroll to it
- **Action bar**: Share / Save / Export JSON / Import JSON / Compare sit in a single row under the results.
  The name field, the list of saved calculations and the comparison itself live in dialogs behind these buttons
- **Save calculation results**: Save with custom names to local storage
- **Manage saved data**: Recall and delete saved calculation results, from the same Save dialog
- **JSON export/import**: Backup and share calculation data
- **Share inputs by URL**: Turn the current inputs into a link that opens with the same conditions
- **Compare wheels**: Pick a current wheel and a new one from the presets, the saved calculations or the
  current (unsaved) inputs. It works out how many spokes can be reused (±1 mm), how many are left over and
  what to buy for each side. Reuse is judged on length alone — gauge and fatigue are not considered
- **Japanese / English**: Switched from the drawer; the choice is remembered. English is the default
- **Light / dark theme**: Follows the OS on first visit, toggled from the drawer, remembered afterwards
- **Menu drawer**: The hamburger in the top right leads to About / How to use / License / Changelog, and holds
  the language and theme controls. A right-side drawer on desktop, a full-screen cover on phones, with the
  version number at the bottom
- **Installable**: A web app manifest and icons ship with the site, so Add to Home Screen runs it standalone.
  There is no service worker, so it still needs a connection
- **Responsive design**: Compatible from smartphones to desktop

## Tech Stack

- **React 19** + **TypeScript**: UI framework
- **Vite**: Fast development server and build tool
- **Tailwind CSS v4**: Utility-first CSS framework, configured CSS-first in `src/index.css`
- **Lucide React**: Icon library
- **react-i18next** (+ **i18next**): English / Japanese translations, kept as JSON under `src/locales/`
- **React Router v8**: Routing for the information pages. Hash routing (`#/about`) means direct links
  and reloads work on GitHub Pages without a 404 fallback. Share URLs ride in the search part under
  the route (`#/?v=1&…`); pre-router `#v=1&…` links are still read

## Setup

```bash
# Install dependencies (also installs the lefthook git hooks)
pnpm install

# Start development server
pnpm dev

# Production build
pnpm build

# Preview build
pnpm preview

# Code quality check
pnpm lint

# Unit tests (node --test, no browser involved)
pnpm test
```

### Regenerating the OG image

`public/og-image-4.png` is the social share card (1200×630). It is committed, not built,
so it only needs regenerating when the card design changes. The source is
[`og/og-card.html`](og/og-card.html) — its header comment holds the authoritative
command sequence, which uses the globally installed `playwright-cli` plus the
zero-dependency static server in [`og/serve.mjs`](og/serve.mjs).

After regenerating, confirm the PNG is exactly 1200×630, under 300 KB, and that the
text renders in Sora rather than a fallback face.

## Usage

1. **Enter basic information**
   - **Presets** (optional): use the chip beside "Input Values" for a whole wheel, or the chips
     beside the Rim / Hub headings to fill just that section
   - Input various dimensions for rim and hub
   - Select number of spokes and lacing pattern

2. **Read the result**
   - Spoke lengths for both sides update live as you type; there is no Calculate button
   - Until you scroll down to it, the result band stays docked to the bottom of the screen

3. **Save results**
   - "Save", in the action bar under the results, opens a dialog where you name and store the calculation
   - The same dialog lists what you have saved, so results can be recalled or deleted later

4. **Share the inputs**
   - "Share", in the action bar, builds a URL that carries the current input conditions
   - Devices with a share sheet open it; elsewhere the link is copied to the clipboard
   - Opening the URL starts with the same inputs (a link that cannot be read starts normally)
   - Only the inputs travel in the URL — results and saved data do not

5. **Compare wheels**
   - "Compare", in the action bar, opens the comparison over the wheel you have and the one you want to build
   - Either side can be a preset, a saved calculation or the current inputs, so nothing has to be saved first
   - The result is how many spokes can be reused, how many are left over, and what to buy for each side

6. **Data management**
   - Export as JSON file
   - Import from JSON file
   - Delete saved data

## Project Structure

```
/the-spoke-calculator/
├── src/
│   ├── App.tsx                    # Shell: header, routes and the menu drawer
│   ├── main.tsx                   # Entry point (HashRouter lives here)
│   ├── index.css                  # Tailwind v4 entry + design tokens
│   ├── styles.ts                  # Shared button / select / link class strings
│   ├── i18n.ts                    # Internationalisation configuration
│   ├── changelog.ts               # Version number and the changelog skeleton
│   ├── changelog.test.ts          # Changelog / version consistency tests
│   ├── locales.test.ts            # Keeps en.json and ja.json structurally identical
│   ├── rimOffset.ts               # Rim offset logic
│   ├── rimOffset.test.ts          # Rim offset unit tests
│   ├── partPresets.ts             # Hub / rim part preset loading and matching
│   ├── presetData.test.ts         # Keeps whole-wheel presets in sync with the parts
│   ├── shareLink.ts               # Puts the inputs in a URL fragment and reads them back
│   ├── shareLink.test.ts          # Share link unit tests
│   ├── spokeCompare.ts            # Wheel comparison logic
│   ├── thirdPartyNotices.test.ts  # Keeps the shipped Lucide notice in sync
│   ├── vite-env.d.ts              # Vite environment types
│   ├── assets/                    # Static assets
│   │   └── react.svg
│   ├── pages/                     # One component per route
│   │   ├── CalculatorPage.tsx     # The calculator itself
│   │   ├── AboutPage.tsx          # About this app
│   │   ├── UsagePage.tsx          # How to use
│   │   ├── LicensePage.tsx        # Renders the repository LICENSE verbatim
│   │   ├── ChangelogPage.tsx      # Latest entry + link to all changes
│   │   ├── ChangelogAllPage.tsx   # Newest year, with links to the others
│   │   ├── ChangelogYearPage.tsx  # A single year
│   │   └── NotFoundPage.tsx       # Unknown hash route
│   ├── components/                # Reusable components
│   │   ├── AppHeader.tsx          # Title + hamburger
│   │   ├── AppDrawer.tsx          # Menu drawer (nav, language, theme, version)
│   │   ├── PageShell.tsx          # Shared frame for the information pages
│   │   ├── ChangelogSections.tsx  # Entry list and year navigation
│   │   ├── ActionBar.tsx          # Action row under the results
│   │   ├── CompareWheels.tsx      # Wheel comparison panel
│   │   ├── ConfirmDialog.tsx      # Confirmation dialog
│   │   ├── HelpButton.tsx         # Inline help trigger
│   │   ├── HelpModal.tsx          # Help modal with SVG diagrams
│   │   ├── InitialDataAlert.tsx   # Warning / error banner
│   │   ├── Modal.tsx              # Generic dialog (focus trap, Escape, stacking)
│   │   ├── PresetSelect.tsx       # Preset picker (CSS customisable select)
│   │   ├── SaveDialog.tsx         # Save and manage stored calculations
│   │   ├── SegmentedControl.tsx   # Segmented radio group
│   │   ├── Toast.tsx              # Toast notification component
│   │   └── icons/MtbHubIcon.tsx   # Custom Lucide-shaped icon
│   ├── contexts/                  # React contexts
│   │   ├── ThemeContext.tsx       # Theme context implementation
│   │   ├── themeContextValue.ts
│   │   ├── ToastContext.tsx       # Toast context implementation
│   │   └── ToastContextDefinition.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useDialogLayer.ts      # Stacking, Escape and focus trap for overlays
│   │   ├── useDockMorph.ts        # Writes --dock for the docking result band
│   │   ├── useTheme.ts            # Theme hook
│   │   └── useToast.ts            # Toast hook
│   ├── locales/                   # Translation files
│   │   ├── en.json                # English translations
│   │   └── ja.json                # Japanese translations
│   └── presets/                   # Preset data
│       ├── *.json                 # Whole wheel: {hub}_{rim}_{Front|Rear}.json (6 files)
│       ├── hubs/                  # Hub only: {hub}_{Front|Rear}.json (4 files)
│       └── rims/                  # Rim only: {rim}.json (2 files)
├── public/                        # Served as-is from the site root
│   ├── calculator.svg             # Favicon
│   ├── icons/                     # Home-screen icons (192 / 512 / maskable / apple-touch)
│   ├── manifest.webmanifest       # Web app manifest
│   ├── og-image-4.png             # Social share card (1200×630)
│   └── THIRD_PARTY_NOTICES.txt    # Lucide's ISC notice, linked from the License page
├── og/                            # Source of the share card; not part of the build
│   ├── og-card.html               # The card itself; its header comment holds the commands
│   └── serve.mjs                  # Zero-dependency static server used while regenerating
├── .github/
│   └── workflows/deploy.yml       # Build and deploy to GitHub Pages on push to main
├── dist/                          # Build output
├── index.html                     # HTML entry: meta tags + theme / language pre-load script
├── AGENTS.md                      # AI assistant instructions
├── CLAUDE.md                      # AI assistant instructions
├── README.md                      # English documentation
├── README_ja.md                   # Japanese documentation
├── LICENSE                        # MIT License, also rendered on the License page
├── package.json                   # Dependencies and configuration
├── pnpm-lock.yaml                 # Locked dependencies
├── pnpm-workspace.yaml            # pnpm build allow-list
├── lefthook.yml                   # pre-commit hooks (ESLint / tsc)
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.app.json              # App-specific TypeScript config
├── tsconfig.node.json             # Node-specific TypeScript config
└── eslint.config.js               # ESLint configuration
```

## Development Notes

- TypeScript runs in strict mode
- Code quality managed with ESLint
- `pnpm test` runs on `node --test` with no bundler or DOM, so the modules it covers
  (`rimOffset.ts`, `shareLink.ts`, `changelog.ts`, `partPresets.ts`) stay free of Vite and DOM imports.
  The suite also guards the data: version against changelog, `en.json` against `ja.json`, the whole-wheel
  presets against the hub / rim parts, and the shipped Lucide notice against the copy in `node_modules`
- `pnpm install` sets up lefthook; pre-commit runs ESLint over staged `.ts`/`.tsx` and `tsc -b` over the project
- Pushing to `main` builds and deploys to GitHub Pages
- Data stored in browser localStorage (saved calculations, language, theme)

## License

[MIT License](LICENSE)

Lucide's icons are used under the ISC License; the notice ships as
[`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt) and is linked from the app's License page.
