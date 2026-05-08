---
applyTo: "**/*.tsx"
---

# Vendure UI:

UI Components are imported from "@vendure/dashboard".

## Vendure Dashboard Stack

- The `@vendure/dashboard` UI layer is a forked/curated stack built on shadcn-style components and Base UI primitives.
- When implementing or reviewing TSX UI, use `.github/instructions/shadcn-ui.instructions.md` and `.github/instructions/base-ui.instructions.md` as reference guidance for component patterns and behavior.

## When to Use Built-in vs. Custom Components

**Built-in `@vendure/dashboard` components** — Use when:
- The component exists in `@vendure/dashboard` and fits your use case
- You need consistency with existing dashboard UI
- The component is already styled and tested
- Examples: Button, Card, Dialog, Combobox, Table, Input, Badge, etc.

**Custom component with Base UI + Tailwind** — Use when:
- `@vendure/dashboard` doesn't have a pre-built component
- You need a specialized or domain-specific UI element
- The built-in component can't be extended to meet your needs

⚠️ **If you're unsure whether to extend an existing component or build a custom one, ask before proceeding.** This helps maintain consistency and avoids duplicating components.

# shadcn/ui

> shadcn/ui is a collection of beautifully-designed, accessible components and a code distribution platform. It is built with TypeScript, Tailwind CSS, and Radix UI primitives. It supports multiple frameworks including Next.js, Vite, Remix, Astro, and more. Open Source. Open Code. AI-Ready. It also comes with a command-line tool to install and manage components and a registry system to publish and distribute code.

## Overview

- [Introduction](https://ui.shadcn.com/docs): Core principles—Open Code, Composition, Distribution, Beautiful Defaults, and AI-Ready design.
- [CLI](https://ui.shadcn.com/docs/cli): Command-line tool for installing and managing components.
- [components.json](https://ui.shadcn.com/docs/components-json): Configuration file for customizing the CLI and component installation.
- [Theming](https://ui.shadcn.com/docs/theming): Guide to customizing colors, typography, and design tokens.
- [Changelog](https://ui.shadcn.com/docs/changelog): Release notes and version history.
- [Skills](https://ui.shadcn.com/docs/skills): Deep shadcn/ui knowledge for AI assistants like Claude Code.
- [Directory](https://ui.shadcn.com/docs/directory): Community registries built into the CLI.

## Installation

- [Next.js](https://ui.shadcn.com/docs/installation/next): Install shadcn/ui in a Next.js project.
- [Vite](https://ui.shadcn.com/docs/installation/vite): Install shadcn/ui in a Vite project.
- [Remix](https://ui.shadcn.com/docs/installation/remix): Install shadcn/ui in a Remix project.
- [Astro](https://ui.shadcn.com/docs/installation/astro): Install shadcn/ui in an Astro project.
- [Laravel](https://ui.shadcn.com/docs/installation/laravel): Install shadcn/ui in a Laravel project.
- [Gatsby](https://ui.shadcn.com/docs/installation/gatsby): Install shadcn/ui in a Gatsby project.
- [React Router](https://ui.shadcn.com/docs/installation/react-router): Install shadcn/ui in a React Router project.
- [TanStack Router](https://ui.shadcn.com/docs/installation/tanstack-router): Install shadcn/ui in a TanStack Router project.
- [TanStack Start](https://ui.shadcn.com/docs/installation/tanstack): Install shadcn/ui in a TanStack Start project.
- [Manual Installation](https://ui.shadcn.com/docs/installation/manual): Manually install shadcn/ui without the CLI.

## Components

### Form & Input

- [Field](https://ui.shadcn.com/docs/components/field): Field component for form inputs with labels and error messages.
- [Button](https://ui.shadcn.com/docs/components/button): Button component with multiple variants.
- [Button Group](https://ui.shadcn.com/docs/components/button-group): Group multiple buttons together.
- [Input](https://ui.shadcn.com/docs/components/input): Text input component.
- [Input Group](https://ui.shadcn.com/docs/components/input-group): Input component with prefix and suffix addons.
- [Input OTP](https://ui.shadcn.com/docs/components/input-otp): One-time password input component.
- [Textarea](https://ui.shadcn.com/docs/components/textarea): Multi-line text input component.
- [Checkbox](https://ui.shadcn.com/docs/components/checkbox): Checkbox input component.
- [Radio Group](https://ui.shadcn.com/docs/components/radio-group): Radio button group component.
- [Select](https://ui.shadcn.com/docs/components/select): Select dropdown component.
- [Native Select](https://ui.shadcn.com/docs/components/native-select): Styled native HTML select element.
- [Switch](https://ui.shadcn.com/docs/components/switch): Toggle switch component.
- [Slider](https://ui.shadcn.com/docs/components/slider): Slider input component.
- [Calendar](https://ui.shadcn.com/docs/components/calendar): Calendar component for date selection.
- [Date Picker](https://ui.shadcn.com/docs/components/date-picker): Date picker component combining input and calendar.
- [Combobox](https://ui.shadcn.com/docs/components/combobox): Searchable select component with autocomplete.
- [Label](https://ui.shadcn.com/docs/components/label): Form label component.

### Layout & Navigation

- [Accordion](https://ui.shadcn.com/docs/components/accordion): Collapsible accordion component.
- [Breadcrumb](https://ui.shadcn.com/docs/components/breadcrumb): Breadcrumb navigation component.
- [Navigation Menu](https://ui.shadcn.com/docs/components/navigation-menu): Accessible navigation menu with dropdowns.
- [Sidebar](https://ui.shadcn.com/docs/components/sidebar): Collapsible sidebar component for app layouts.
- [Tabs](https://ui.shadcn.com/docs/components/tabs): Tabbed interface component.
- [Separator](https://ui.shadcn.com/docs/components/separator): Visual divider between content sections.
- [Scroll Area](https://ui.shadcn.com/docs/components/scroll-area): Custom scrollable area with styled scrollbars.
- [Resizable](https://ui.shadcn.com/docs/components/resizable): Resizable panel layout component.

### Overlays & Dialogs

- [Dialog](https://ui.shadcn.com/docs/components/dialog): Modal dialog component.
- [Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog): Alert dialog for confirmation prompts.
- [Sheet](https://ui.shadcn.com/docs/components/sheet): Slide-out panel component (drawer).
- [Drawer](https://ui.shadcn.com/docs/components/drawer): Mobile-friendly drawer component using Vaul.
- [Popover](https://ui.shadcn.com/docs/components/popover): Floating popover component.
- [Tooltip](https://ui.shadcn.com/docs/components/tooltip): Tooltip component for additional context.
- [Hover Card](https://ui.shadcn.com/docs/components/hover-card): Card that appears on hover.
- [Context Menu](https://ui.shadcn.com/docs/components/context-menu): Right-click context menu.
- [Dropdown Menu](https://ui.shadcn.com/docs/components/dropdown-menu): Dropdown menu component.
- [Menubar](https://ui.shadcn.com/docs/components/menubar): Horizontal menubar component.
- [Command](https://ui.shadcn.com/docs/components/command): Command palette component (cmdk).

### Feedback & Status

- [Alert](https://ui.shadcn.com/docs/components/alert): Alert component for messages and notifications.
- [Toast](https://ui.shadcn.com/docs/components/toast): Toast notification component using Sonner.
- [Sonner](https://ui.shadcn.com/docs/components/sonner): Opinionated toast component for React.
- [Progress](https://ui.shadcn.com/docs/components/progress): Progress bar component.
- [Spinner](https://ui.shadcn.com/docs/components/spinner): Loading spinner component.
- [Skeleton](https://ui.shadcn.com/docs/components/skeleton): Skeleton loading placeholder.
- [Badge](https://ui.shadcn.com/docs/components/badge): Badge component for labels and status indicators.
- [Empty](https://ui.shadcn.com/docs/components/empty): Empty state component for no data scenarios.

### Display & Media

- [Avatar](https://ui.shadcn.com/docs/components/avatar): Avatar component for user profiles.
- [Card](https://ui.shadcn.com/docs/components/card): Card container component.
- [Table](https://ui.shadcn.com/docs/components/table): Table component for displaying data.
- [Data Table](https://ui.shadcn.com/docs/components/data-table): Advanced data table with sorting, filtering, and pagination.
- [Chart](https://ui.shadcn.com/docs/components/chart): Chart components using Recharts.
- [Carousel](https://ui.shadcn.com/docs/components/carousel): Carousel component using Embla Carousel.
- [Aspect Ratio](https://ui.shadcn.com/docs/components/aspect-ratio): Container that maintains aspect ratio.
- [Typography](https://ui.shadcn.com/docs/components/typography): Typography styles and components.
- [Item](https://ui.shadcn.com/docs/components/item): Generic item component for lists and menus.
- [Kbd](https://ui.shadcn.com/docs/components/kbd): Keyboard shortcut display component.

### Misc

- [Collapsible](https://ui.shadcn.com/docs/components/collapsible): Collapsible container component.
- [Toggle](https://ui.shadcn.com/docs/components/toggle): Toggle button component.
- [Toggle Group](https://ui.shadcn.com/docs/components/toggle-group): Group of toggle buttons.
- [Pagination](https://ui.shadcn.com/docs/components/pagination): Pagination component for lists and tables.
- [Direction](https://ui.shadcn.com/docs/components/direction): Text direction provider for RTL support.

## Dark Mode

- [Dark Mode](https://ui.shadcn.com/docs/dark-mode): Overview of dark mode implementation.
- [Dark Mode - Next.js](https://ui.shadcn.com/docs/dark-mode/next): Dark mode setup for Next.js.
- [Dark Mode - Vite](https://ui.shadcn.com/docs/dark-mode/vite): Dark mode setup for Vite.
- [Dark Mode - Astro](https://ui.shadcn.com/docs/dark-mode/astro): Dark mode setup for Astro.
- [Dark Mode - Remix](https://ui.shadcn.com/docs/dark-mode/remix): Dark mode setup for Remix.

## RTL

- [RTL](https://ui.shadcn.com/docs/rtl): Overview of right-to-left language support.
- [RTL - Next.js](https://ui.shadcn.com/docs/rtl/next): RTL setup for Next.js.
- [RTL - Vite](https://ui.shadcn.com/docs/rtl/vite): RTL setup for Vite.
- [RTL - TanStack Start](https://ui.shadcn.com/docs/rtl/start): RTL setup for TanStack Start.

## Forms

- [Forms Overview](https://ui.shadcn.com/docs/forms): Guide to building forms with shadcn/ui.
- [React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form): Using shadcn/ui with React Hook Form.
- [TanStack Form](https://ui.shadcn.com/docs/forms/tanstack-form): Using shadcn/ui with TanStack Form.
- [Forms - Next.js](https://ui.shadcn.com/docs/forms/next): Building forms in Next.js with Server Actions.

## Advanced

- [Monorepo](https://ui.shadcn.com/docs/monorepo): Using shadcn/ui in a monorepo setup.
- [React 19](https://ui.shadcn.com/docs/react-19): React 19 support and migration guide.
- [Tailwind CSS v4](https://ui.shadcn.com/docs/tailwind-v4): Tailwind CSS v4 support and setup.
- [JavaScript](https://ui.shadcn.com/docs/javascript): Using shadcn/ui with JavaScript (no TypeScript).
- [Figma](https://ui.shadcn.com/docs/figma): Figma design resources.
- [v0](https://ui.shadcn.com/docs/v0): Generating UI with v0 by Vercel.

## MCP Server

- [MCP Server](https://ui.shadcn.com/docs/mcp): Model Context Protocol server for AI integrations. Allows AI assistants to browse, search, and install components from registries using natural language. Works with Claude Code, Cursor, VS Code (GitHub Copilot), Codex and more.

## Registry

- [Registry Overview](https://ui.shadcn.com/docs/registry): Creating and publishing your own component registry.
- [Getting Started](https://ui.shadcn.com/docs/registry/getting-started): Set up your own registry.
- [Examples](https://ui.shadcn.com/docs/registry/examples): Example registries.
- [FAQ](https://ui.shadcn.com/docs/registry/faq): Common questions about registries.
- [Authentication](https://ui.shadcn.com/docs/registry/authentication): Adding authentication to your registry.
- [Registry MCP](https://ui.shadcn.com/docs/registry/mcp): MCP integration for registries.
- [Namespaces](https://ui.shadcn.com/docs/registry/namespace): Using multiple registries with namespace support.
- [Add a Registry](https://ui.shadcn.com/docs/registry/registry-index): Open source registry index and how to submit yours.
- [Open in v0](https://ui.shadcn.com/docs/registry/open-in-v0): Integrating your registry with Open in v0.
- [registry.json](https://ui.shadcn.com/docs/registry/registry-json): `registry.json` schema for your own registry.
- [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json): `registry-item.json` specification for registry items.

### Registry Schemas

- [Registry Schema](https://ui.shadcn.com/schema/registry.json): JSON Schema for registry index files. Defines the structure for a collection of components, hooks, pages, etc. Requires name, homepage, and items array.
- [Registry Item Schema](https://ui.shadcn.com/schema/registry-item.json): JSON Schema for individual registry items. Defines components, hooks, themes, and other distributable code with properties for dependencies, files, Tailwind config, CSS variables, and more.


# Base UI

This is the documentation for the `@base-ui/react` package.
It contains a collection of components and utilities for building user interfaces in React.
The library is designed to be composable and styling agnostic.
The Tailwind CSS examples are written for Tailwind CSS v4. If `package.json` uses Tailwind CSS v3, automatically convert unsupported styles to v3-compatible equivalents.

## Overview

- [Quick start](https://base-ui.com/react/overview/quick-start.md): A quick guide to getting started with Base UI.
- [Accessibility](https://base-ui.com/react/overview/accessibility.md): Learn how to make the most of Base UI's accessibility features and guidelines.
- [Releases](https://base-ui.com/react/overview/releases.md):
- [About Base UI](https://base-ui.com/react/overview/about.md): An overview of Base UI, providing information on its history, team, and goals.
- [Community](https://base-ui.com/react/overview/community.md): Learn how to use Base UI with styles, where to get help, how to stay up to date, and how to contribute.
- [v1.0.0](https://base-ui.com/react/overview/releases/v1-0-0.md): v1.0.0 release notes. Dec 11, 2025.
- [v1.0.0-alpha.4](https://base-ui.com/react/overview/releases/v1-0-0-alpha-4.md): v1.0.0-alpha.4 release notes. Dec 17, 2024.
- [v1.0.0-alpha.5](https://base-ui.com/react/overview/releases/v1-0-0-alpha-5.md): v1.0.0-alpha.5 release notes. Jan 10, 2025.
- [v1.0.0-alpha.6](https://base-ui.com/react/overview/releases/v1-0-0-alpha-6.md): v1.0.0-alpha.6 release notes. Feb 6, 2025.
- [v1.0.0-alpha.7](https://base-ui.com/react/overview/releases/v1-0-0-alpha-7.md): v1.0.0-alpha.7 release notes. Mar 20, 2025.
- [v1.0.0-alpha.8](https://base-ui.com/react/overview/releases/v1-0-0-alpha-8.md): v1.0.0-alpha.8 release notes. Apr 17, 2025.
- [v1.0.0-beta.0](https://base-ui.com/react/overview/releases/v1-0-0-beta-0.md): v1.0.0-beta.0 release notes. May 29, 2025.
- [v1.0.0-beta.1](https://base-ui.com/react/overview/releases/v1-0-0-beta-1.md): v1.0.0-beta.1 release notes. Jul 1, 2025.
- [v1.0.0-beta.2](https://base-ui.com/react/overview/releases/v1-0-0-beta-2.md): v1.0.0-beta.2 release notes. Jul 30, 2025.
- [v1.0.0-beta.3](https://base-ui.com/react/overview/releases/v1-0-0-beta-3.md): v1.0.0-beta.3 release notes. Sep 3, 2025.
- [v1.0.0-beta.4](https://base-ui.com/react/overview/releases/v1-0-0-beta-4.md): v1.0.0-beta.4 release notes. Oct 1, 2025.
- [v1.0.0-beta.5](https://base-ui.com/react/overview/releases/v1-0-0-beta-5.md): v1.0.0-beta.5 release notes. Nov 17, 2025.
- [v1.0.0-beta.6](https://base-ui.com/react/overview/releases/v1-0-0-beta-6.md): v1.0.0-beta.6 release notes. Nov 17, 2025.
- [v1.0.0-beta.7](https://base-ui.com/react/overview/releases/v1-0-0-beta-7.md): v1.0.0-beta.7 release notes. Nov 27, 2025.
- [v1.0.0-rc.0](https://base-ui.com/react/overview/releases/v1-0-0-rc-0.md): v1.0.0-rc.0 release notes. Dec 4, 2025.
- [v1.0.0-rc.1](https://base-ui.com/react/overview/releases/v1-0-0-rc-1.md): v1.0.0-rc.1 release notes. Dec 11, 2025.
- [v1.0.0-rc.2](https://base-ui.com/react/overview/releases/v1-0-0-rc-2.md): v1.0.0-rc.2 release notes. Dec 11, 2025.
- [v1.1.0](https://base-ui.com/react/overview/releases/v1-1-0.md): v1.1.0 release notes. Jan 15, 2026.
- [v1.2.0](https://base-ui.com/react/overview/releases/v1-2-0.md): v1.2.0 release notes. Feb 12, 2026.
- [v1.3.0](https://base-ui.com/react/overview/releases/v1-3-0.md): v1.3.0 release notes. Mar 12, 2026.
- [v1.4.0](https://base-ui.com/react/overview/releases/v1-4-0.md): v1.4.0 release notes. Apr 13, 2026.
- [v1.4.1](https://base-ui.com/react/overview/releases/v1-4-1.md): v1.4.1 release notes. Apr 20, 2026.

## Handbook

- [Styling](https://base-ui.com/react/handbook/styling.md): Learn how to style Base UI components with your preferred styling engine.
- [Animation](https://base-ui.com/react/handbook/animation.md): A guide to animating Base UI components.
- [Composition](https://base-ui.com/react/handbook/composition.md): A guide to composing Base UI components with your own React components.
- [Customization](https://base-ui.com/react/handbook/customization.md): A guide to customizing the behavior of Base UI components.
- [Forms](https://base-ui.com/react/handbook/forms.md): A guide to building forms with Base UI components.
- [TypeScript](https://base-ui.com/react/handbook/typescript.md): A guide to using TypeScript with Base UI.

## Components

- [Accordion](https://base-ui.com/react/components/accordion.md): A high-quality, unstyled React accordion component that displays a set of collapsible panels with headings.
- [Alert Dialog](https://base-ui.com/react/components/alert-dialog.md): A high-quality, unstyled React alert dialog component that requires a user response to proceed.
- [Autocomplete](https://base-ui.com/react/components/autocomplete.md): A high-quality, unstyled React autocomplete component that renders an input with a list of filtered options.
- [Avatar](https://base-ui.com/react/components/avatar.md): A high-quality, unstyled React avatar component that is easy to customize.
- [Button](https://base-ui.com/react/components/button.md): A high-quality, unstyled React button component that can be rendered as another tag or focusable when disabled.
- [Checkbox](https://base-ui.com/react/components/checkbox.md): A high-quality, unstyled React checkbox component that is easy to customize.
- [Checkbox Group](https://base-ui.com/react/components/checkbox-group.md): A high-quality, unstyled React checkbox group component that provides a shared state for a series of checkboxes.
- [Collapsible](https://base-ui.com/react/components/collapsible.md): A high-quality, unstyled React collapsible component that displays a panel controlled by a button.
- [Combobox](https://base-ui.com/react/components/combobox.md): A high-quality, unstyled React combobox component that renders an input combined with a list of predefined items to select.
- [Context Menu](https://base-ui.com/react/components/context-menu.md): A high-quality, unstyled React context menu component that appears at the pointer on right click or long press.
- [Dialog](https://base-ui.com/react/components/dialog.md): A high-quality, unstyled React dialog component that opens on top of the entire page.
- [Drawer](https://base-ui.com/react/components/drawer.md): A high-quality, unstyled React drawer component with swipe-to-dismiss gestures.
- [Field](https://base-ui.com/react/components/field.md): A high-quality, unstyled React field component that provides labeling and validation for form controls.
- [Fieldset](https://base-ui.com/react/components/fieldset.md): A high-quality, unstyled React fieldset component with an easily stylable legend.
- [Form](https://base-ui.com/react/components/form.md): A high-quality, unstyled React form component with consolidated error handling.
- [Input](https://base-ui.com/react/components/input.md): A high-quality, unstyled React input component.
- [Menu](https://base-ui.com/react/components/menu.md): A high-quality, unstyled React menu component that displays list of actions in a dropdown, enhanced with keyboard navigation.
- [Menubar](https://base-ui.com/react/components/menubar.md): A menu bar providing commands and options for your application.
- [Meter](https://base-ui.com/react/components/meter.md): A high-quality, unstyled React meter component that provides a graphical display of a numeric value.
- [Navigation Menu](https://base-ui.com/react/components/navigation-menu.md): A high-quality, unstyled React navigation menu component that displays a collection of links and menus for website navigation.
- [Number Field](https://base-ui.com/react/components/number-field.md): A high-quality, unstyled React number field component with increment and decrement buttons, and a scrub area.
- [OTP Field](https://base-ui.com/react/components/otp-field.md): A high-quality, unstyled React OTP field component for one-time password and verification code entry.
- [Popover](https://base-ui.com/react/components/popover.md): A high-quality, unstyled React popover component that displays an accessible popup anchored to a button.
- [Preview Card](https://base-ui.com/react/components/preview-card.md): A high-quality, unstyled React preview card component that appears when a link is hovered, showing a preview for sighted users.
- [Progress](https://base-ui.com/react/components/progress.md): A high-quality, unstyled React progress bar component that displays the status of a task that takes a long time.
- [Radio](https://base-ui.com/react/components/radio.md): A high-quality, unstyled React radio button component that is easy to style.
- [Scroll Area](https://base-ui.com/react/components/scroll-area.md): A high-quality, unstyled React scroll area that provides a native scroll container with custom scrollbars.
- [Select](https://base-ui.com/react/components/select.md): A high-quality, unstyled React select component for choosing a predefined value in a dropdown menu.
- [Separator](https://base-ui.com/react/components/separator.md): A high-quality, unstyled React separator component that is accessible to screen readers.
- [Slider](https://base-ui.com/react/components/slider.md): A high-quality, unstyled React slider component that works like a range input and is easy to style.
- [Switch](https://base-ui.com/react/components/switch.md): A high-quality, unstyled React switch component that indicates whether a setting is on or off.
- [Tabs](https://base-ui.com/react/components/tabs.md): A high-quality, unstyled React tabs component for toggling between related panels on the same page.
- [Toast](https://base-ui.com/react/components/toast.md): A high-quality, unstyled React toast component to generate notifications.
- [Toggle](https://base-ui.com/react/components/toggle.md): A high-quality, unstyled React toggle component that displays a two-state button that can be on or off.
- [Toggle Group](https://base-ui.com/react/components/toggle-group.md): A high-quality, unstyled React toggle group component that provides shared state to a series of toggle buttons.
- [Toolbar](https://base-ui.com/react/components/toolbar.md): A high-quality, unstyled React toolbar component that groups a set of buttons and controls.
- [Tooltip](https://base-ui.com/react/components/tooltip.md): A high-quality, unstyled React tooltip component that appears when an element is hovered or focused, showing a hint for sighted users.

## Utilities

- [CSP Provider](https://base-ui.com/react/utils/csp-provider.md): A CSP provider component that applies a nonce to inline <style> and <script> tags rendered by Base UI components, and can disable inline <style> elements.
- [Direction Provider](https://base-ui.com/react/utils/direction-provider.md): A direction provider component that enables RTL behavior for Base UI components.
- [mergeProps](https://base-ui.com/react/utils/merge-props.md): A utility to merge multiple sets of React props, handling event handlers, className, and style props intelligently.
- [useRender](https://base-ui.com/react/utils/use-render.md): Hook for enabling a render prop in custom components.
