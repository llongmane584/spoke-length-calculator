# Bicycle Spoke Length Calculator

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
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Code quality check
npm run lint
```

## Usage

1. **Enter basic information**
   - **Preset selection**: Choose from hub/rim combinations (optional)
   - Input various dimensions for rim and hub
   - Select number of spokes and lacing pattern

2. **Execute calculation**
   - Click "Calculate" button to display spoke lengths for both sides

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
│   ├── index.css                  # Global styles
│   ├── i18n.ts                    # Internationalization configuration
│   ├── vite-env.d.ts              # Vite environment types
│   ├── assets/                    # Static assets
│   │   └── react.svg
│   ├── components/                # Reusable components
│   │   └── Toast.tsx              # Toast notification component
│   ├── contexts/                  # React contexts
│   │   ├── ToastContext.tsx       # Toast context implementation
│   │   └── ToastContextDefinition.ts
│   ├── hooks/                     # Custom React hooks
│   │   └── useToast.ts            # Toast hook
│   ├── locales/                   # Translation files
│   │   ├── en.json                # English translations
│   │   └── ja.json                # Japanese translations
│   └── presets/                   # Preset data
│       ├── Hope-Pro-5-IS6_Nextie-Premium-2936_Front.json
│       └── Hope-Pro-5-IS6_Nextie-Premium-2936_Rear.json
├── public/                        # Static files
│   └── wheel.png
├── dist/                          # Build output
├── CLAUDE.md                      # AI assistant instructions
├── README.md                      # English documentation
├── README_ja.md                   # Japanese documentation
├── package.json                   # Dependencies and configuration
├── package-lock.json              # Locked dependencies
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.app.json              # App-specific TypeScript config
├── tsconfig.node.json             # Node-specific TypeScript config
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.cjs             # PostCSS configuration
└── eslint.config.js               # ESLint configuration
```

## Development Notes

- TypeScript runs in strict mode
- Code quality managed with ESLint
- Data stored in browser localStorage

## License

[MIT License](LICENSE).
