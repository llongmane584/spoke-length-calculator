# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## GitHub repository information
- Please reference the `.git/config` file to retrieve the repository URL from the `[remote "origin"]` section
- You can verify the remote URL using the `git config --get remote.origin.url` command
- When repository basic information is needed, please check `.git/config` first

## Commands

## GitHub Issues Management

### Viewing Issues
- List all issues: `gh issue list`
- View specific issue: `gh issue view <issue-number>`
- List issues with filters: `gh issue list --state open --assignee @me`

### Creating and Editing Issues
- Create new issue: `gh issue create --title "Title" --body "Description"`
- Edit existing issue: `gh issue edit <issue-number> --title "New Title" --body "New Description"`
- Add labels: `gh issue edit <issue-number> --add-label "bug,enhancement"`
- Assign issue: `gh issue edit <issue-number> --add-assignee "username"`
- Close issue: `gh issue close <issue-number>`
- Reopen issue: `gh issue reopen <issue-number>`

### Issue Workflow Commands
- Comment on issue: `gh issue comment <issue-number> --body "Comment text"`
- Link to PR: `gh issue edit <issue-number> --add-label "linked-pr"`
- Set milestone: `gh issue edit <issue-number> --milestone "v1.0"`

### Required Tools
- Ensure GitHub CLI (`gh`) is installed and authenticated
- Use `gh auth status` to verify authentication
- When working with issues, always specify issue numbers clearly

### Development
- `pnpm dev` - Start development server with hot module replacement
- `pnpm build` - Compile TypeScript and create production build
- `pnpm lint` - Run ESLint to check code quality
- `pnpm preview` - Preview production build locally

### Installation
- `pnpm install` - Install all dependencies

## Architecture

This is a Spoke Length Calculator web application built with:
- **React 19** + **TypeScript** for the UI
- **Vite** as the build tool and dev server
- **ESLint** for code quality

### Project Structure
- `/src` - All React components and application code
  - `main.tsx` - Application entry point
  - `App.tsx` - Root React component
- `/public` - Static assets served directly
- `index.html` - HTML entry point
- `vite.config.ts` - Vite bundler configuration
- `tsconfig.json` - TypeScript configuration (uses project references)

### Development Notes
- The project uses TypeScript in strict mode
- ESLint is configured with React-specific rules and hooks linting
- No testing framework is currently set up
- The application is currently showing the default Vite template and needs to be implemented with spoke calculation functionality
