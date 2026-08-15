---
name: frontend-design
description: Design and implement distinctive, production-grade web interfaces. Use when the task involves building or restyling pages, components, landing pages, dashboards, web artifacts, posters, React/Vue/HTML/CSS interfaces, or polishing an existing frontend. Cover art direction, accessibility, responsive behavior, UI states, performance, implementation, and browser verification while respecting the product's design system and repository conventions.
---

# Frontend Design

Create a coherent interface that serves the product and feels intentionally designed. Treat visual originality and production quality as separate requirements; satisfy both.

## Work in This Order

### 1. Understand the Product

- Read repository instructions and inspect the existing application before changing code.
- Identify the audience, primary task, content hierarchy, supported devices, locales, framework, browser targets, and performance constraints.
- Reuse existing components, tokens, utilities, assets, and interaction patterns when they are sound.
- Evolve an existing product's visual language instead of imposing an unrelated redesign.
- Make reasonable assumptions when context is sufficient. Ask only when a missing choice would materially change the result.

### 2. Define the Design Direction

- State a one-sentence design thesis that connects the product's purpose, tone, and one memorable visual idea.
- Choose the level of expression appropriate to the context: restrained, editorial, playful, industrial, luxurious, dense, or another defensible direction.
- Establish hierarchy, spacing rhythm, type roles, color roles, shape language, and motion behavior before polishing details.
- Prefer context-specific decisions over fashionable defaults or arbitrary novelty.
- Avoid generic AI compositions such as interchangeable hero layouts, gratuitous glass cards, decorative gradients without purpose, and uniformly rounded containers.
- Do not reject a familiar font, layout, or component merely because it is common. Use it when it best serves readability, performance, brand, or convention.

### 3. Plan Content, States, and Responsiveness

- Design the main task flow before secondary decoration.
- Account for loading, empty, error, success, disabled, selected, hover, focus, and destructive states where applicable.
- Plan for narrow and wide containers, touch and pointer input, text zoom, long content, and every supported locale.
- Keep the DOM and reading order logical even when the visual composition is asymmetric or layered.
- Preserve content and functionality through reflow; avoid overlaps that fail with longer text or smaller viewports.

### 4. Implement the Interface

#### System Alignment

- Follow repository-specific instructions over this skill.
- Use the project's framework, styling architecture, semantic tokens, shared primitives, and naming conventions.
- Add a dependency only when its user value justifies its bundle, maintenance, and integration cost.
- Keep implementation complexity proportional to user value and product needs, not visual intensity.

#### Typography

- Choose type for legibility, voice, language coverage, and content density.
- Define robust fallback stacks and test every supported script, including CJK when applicable.
- Limit font files, weights, and subsets; load web fonts without hiding content or causing avoidable layout shift.
- Use distinctive display typography selectively. Keep body and control text easy to scan.

#### Color and Theme

- Express color through semantic tokens rather than scattered literal values.
- Maintain sufficient text, control, focus, and state contrast in every supported theme.
- Never use color as the only carrier of meaning.
- Respect existing theme behavior and user preferences instead of inventing a parallel theme system.

#### Layout and Visual Detail

- Use Grid, Flexbox, intrinsic sizing, fluid values, and container queries where they simplify resilient layouts.
- Use whitespace, density, asymmetry, overlap, texture, gradients, borders, shadows, or illustration only when they reinforce the design thesis.
- Keep decoration subordinate to content and interaction.
- Preserve familiar affordances for controls. Use custom cursors only in rare, nonessential contexts while retaining native interaction semantics.

#### Interaction and Motion

- Make every interaction work with keyboard, pointer, and touch as applicable.
- Pair hover feedback with visible focus feedback; never hide required actions behind hover alone.
- Use motion to explain change, hierarchy, or causality. Avoid motion whose only purpose is to delay access to content.
- Honor `prefers-reduced-motion` and provide a non-motion equivalent for nonessential animation.
- Prefer CSS for simple transitions. Use an existing motion library only for interactions that need orchestration, interruption, gestures, or lifecycle control.
- Avoid unexpected scrolling, focus movement, parallax, bounce, or layout-shifting animation.

#### Accessibility

- Target WCAG 2.2 AA unless the project specifies a stronger standard.
- Prefer semantic HTML and native controls. Add ARIA only when native semantics cannot express the required pattern.
- Provide accessible names, labels, instructions, validation feedback, and announced dynamic status where needed.
- Preserve a visible focus indicator and logical focus order. Do not trap or obscure focus.
- Ensure controls have usable target sizes and do not require precision dragging when an equivalent simple input is possible.
- Keep content operable at 200% text zoom and when CSS pixels reflow to a narrow viewport.

#### Performance and Resilience

- Protect current Core Web Vitals by avoiding unnecessary JavaScript, unstable geometry, render-blocking assets, and expensive visual effects.
- Reserve dimensions for images and embedded media; provide appropriately sized responsive assets.
- Prefer progressive enhancement and keep the primary task usable when optional effects fail.
- Avoid introducing runtime work for styling that CSS can handle reliably.

### 5. Verify Before Finishing

- Run the repository's required formatter, type checks, lint, and relevant tests.
- Inspect the result in a real browser at representative narrow and wide viewports.
- Exercise the complete primary flow and all changed UI states.
- Navigate the changed interface using only the keyboard and confirm visible, unobscured focus.
- Test reduced-motion and every supported theme.
- Check long content and supported locales; verify reflow at 200% zoom.
- Confirm that the browser console has no new errors or warnings.
- Check for layout shift, sluggish interaction, oversized assets, or bundle regressions when the change could affect them.
- Report what was actually verified and disclose any check that could not be run.

## Decision Priorities

When goals conflict, use this order:

1. Correctness and completion of the user's task
2. Accessibility and usability
3. Consistency with the product and repository
4. Responsive behavior and content resilience
5. Performance and maintainability
6. Visual distinction and delight

Use standard interaction patterns where familiarity helps people succeed. Create distinction through art direction, composition, typography, content, and detail—not by making controls unpredictable.
