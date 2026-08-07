# Bicycle Spoke Length Calculator

## Demo page
GitHub pages: https://llongmane584.github.io/spoke-length-calculator/

[日本語](README_ja.md)

- A web application for (as accurately as possible) calculating spoke lengths required for bicycle wheel building.
- If you want to be strictly accurate, you need to consider the rim's inner wall thickness and nipple length, so please modify the tool if you care about these details.
- If the calculations from this tool don't work out, please don't complain to the author - improve it yourself.
- Each parameter is based on what can be input from the [Hope Pro 5](https://www.hopetech.com/products/hubs/mountain-bike/pro-5-110mm-boost-front/) specification document.

## Development

Most of the code in this project was created with [Claude Code](https://claude.ai/code).

## Features

- **Precise spoke length calculation**: Uses common formulas combining cosine rule (planar) and Pythagorean theorem (3D)
- **Preset functionality**: Select from author-owned hub/rim combinations
  - Hope Pro 5 IS6 + Nextie Premium 2936 (Front/Rear)
- **Rich input parameters**:
  - ERD (Effective Rim Diameter)
  - Rim offset (automatically applied to reduce the effective left/right flange-distance difference)
  - Left and right hub flange PCD (Pitch Circle Diameter)
  - Distance between left and right flanges
  - Spoke hole diameter
  - Number of spokes (24, 28, 32, 36)
  - Lacing pattern for both sides (0-4 cross)
- **Save calculation results**: Save with custom names to local storage
- **Manage saved data**: View and delete saved calculation results
- **JSON export/import**: Backup and share calculation data
- **Responsive design**: Compatible from smartphones to desktop

## Tech Stack

- **React 19** + **TypeScript**: UI framework
- **Vite**: Fast development server and build tool
- **Tailwind CSS v4**: Utility-first CSS framework, configured CSS-first in `src/index.css`
- **Lucide React**: Icon library

## Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Production build
pnpm build

# Preview build
pnpm preview

# Code quality check
pnpm lint
```

## Usage

1. **Enter basic information**
   - **Preset selection**: Choose from hub/rim combinations (optional)
   - Input various dimensions for rim and hub
   - Select number of spokes and lacing pattern

2. **Read the result**
   - Spoke lengths for both sides update live as you type; there is no Calculate button

3. **Save results**
   - Save calculation results with custom names
   - Saved data can be recalled later

4. **Data management**
   - Export as JSON file
   - Import from JSON file
   - Delete saved data

## Project Structure

```
/spoke-length-calculator/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Tailwind v4 entry + design tokens
│   ├── styles.ts                  # Shared button / select class strings
│   ├── i18n.ts                    # Internationalization configuration
│   ├── rimOffset.ts               # Rim offset logic
│   ├── rimOffset.test.ts          # Rim offset unit tests
│   ├── spokeCompare.ts            # Wheel comparison logic
│   ├── vite-env.d.ts              # Vite environment types
│   ├── assets/                    # Static assets
│   │   └── react.svg
│   ├── components/                # Reusable components
│   │   ├── CompareWheels.tsx      # Wheel comparison panel
│   │   ├── ConfirmDialog.tsx      # Confirmation dialog
│   │   ├── HelpButton.tsx         # Inline help trigger
│   │   ├── HelpModal.tsx          # Help modal with SVG diagrams
│   │   ├── SegmentedControl.tsx   # Segmented radio group
│   │   └── Toast.tsx              # Toast notification component
│   ├── contexts/                  # React contexts
│   │   ├── ThemeContext.tsx       # Theme context implementation
│   │   ├── themeContextValue.ts
│   │   ├── ToastContext.tsx       # Toast context implementation
│   │   └── ToastContextDefinition.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useTheme.ts            # Theme hook
│   │   └── useToast.ts            # Toast hook
│   ├── locales/                   # Translation files
│   │   ├── en.json                # English translations
│   │   └── ja.json                # Japanese translations
│   └── presets/                   # Preset data (6 files)
│       ├── Hope-Pro-5-CL_Nextie-Premium-2936_Front.json
│       ├── Hope-Pro-5-CL_Nextie-Premium-2936_Rear.json
│       ├── Hope-Pro-5-IS6_Nextie-Premium-2936_Front.json
│       ├── Hope-Pro-5-IS6_Nextie-Premium-2936_Rear.json
│       ├── Hope-Pro-5-IS6_Stans-Flow-MK4_Front.json
│       └── Hope-Pro-5-IS6_Stans-Flow-MK4_Rear.json
├── public/                        # Static files
│   └── calculator.svg
├── dist/                          # Build output
├── AGENTS.md                      # AI assistant instructions
├── CLAUDE.md                      # AI assistant instructions
├── README.md                      # English documentation
├── README_ja.md                   # Japanese documentation
├── package.json                   # Dependencies and configuration
├── pnpm-lock.yaml                 # Locked dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.app.json              # App-specific TypeScript config
├── tsconfig.node.json             # Node-specific TypeScript config
└── eslint.config.js               # ESLint configuration
```

## Development Notes

- TypeScript runs in strict mode
- Code quality managed with ESLint
- Data stored in browser localStorage

## License

[MIT License](LICENSE)
