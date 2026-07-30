---
name: Precision Print India
colors:
  surface: '#faf9fc'
  surface-dim: '#dadadc'
  surface-bright: '#faf9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f6'
  surface-container: '#eeedf0'
  surface-container-high: '#e8e8eb'
  surface-container-highest: '#e3e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#424752'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f3'
  outline: '#727783'
  outline-variant: '#c2c6d4'
  surface-tint: '#005db5'
  primary: '#00488d'
  on-primary: '#ffffff'
  primary-container: '#005fb8'
  on-primary-container: '#cadcff'
  inverse-primary: '#a8c8ff'
  secondary: '#486176'
  on-secondary: '#ffffff'
  secondary-container: '#cbe6ff'
  on-secondary-container: '#4e677c'
  tertiary: '#4b455a'
  on-tertiary: '#ffffff'
  tertiary-container: '#635c72'
  on-tertiary-container: '#e0d6f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#00468b'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#afcae2'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#30495d'
  tertiary-fixed: '#e8def9'
  tertiary-fixed-dim: '#ccc2dc'
  on-tertiary-fixed: '#1e192b'
  on-tertiary-fixed-variant: '#4a4358'
  background: '#faf9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e5'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
  currency-display:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  container-max: 1280px
---

## Brand & Style
The brand personality is professional, systematic, and culturally attuned to the Indian business landscape. It evokes a sense of reliability and statutory compliance, essential for GST-ready operations. The design style follows a **Corporate / Modern** aesthetic, heavily influenced by Material Design 3 principles but refined for density and clarity in data-heavy administrative workflows. 

The target audience includes Indian small-to-medium enterprises (SMEs), chartered accountants, and operations managers who require high precision in invoicing and logistics. The UI emphasizes a "trust-first" approach through structured layouts and a calm, blue-centric palette.

## Colors
The color palette is anchored by a deep professional blue (`#005FB8`) to signal stability and authority. 

- **Primary:** Used for key actions, active states, and brand-critical components.
- **Secondary/Tertiary:** Utilized for utility actions and supporting UI elements to maintain a balanced hierarchy.
- **GST Status Tokens:** This design system introduces specific semantic colors for tax breakdown:
    - **CGST:** A deep ocean blue for central tax components.
    - **SGST:** A teal-leaning green for state tax components.
    - **IGST:** A burnt orange for integrated interstate tax components to ensure visual distinction in invoice tables.
- **Neutral:** A slightly cool-tinted white base to reduce eye strain during long working hours.

## Typography
The typography system is designed for high legibility in bilingual contexts. 
- **Headlines:** Use **Plus Jakarta Sans** for its modern, approachable yet professional feel.
- **Body:** **Inter** is used for the core UI to ensure that dense alphanumeric data (like GSTINs and PANs) remains highly readable.
- **Labels:** **IBM Plex Sans** provides a technical, structured feel for form labels and table headers.

The system is optimized to support Hindi and regional script rendering gracefully, ensuring character heights do not clash with line-height settings. All currency displays must use the standard Rupee symbol (₹) followed by the amount in Indian numbering format (e.g., ₹1,00,000).

## Layout & Spacing
This design system utilizes a **Fluid Grid** model based on a 4px baseline shift to maintain mathematical harmony.

- **Desktop:** 12-column grid with 24px margins and 16px gutters.
- **Tablet:** 8-column grid with 24px margins.
- **Mobile:** 4-column grid with 16px margins.

The layout philosophy prioritizes "Data-First" density. In document views (like Invoices), use a centered fixed-width container (`1280px`) to mimic the physical print output, while administrative dashboards should utilize the full fluid width.

## Elevation & Depth
Hierarchy is established through **Tonal Layers** rather than heavy shadows, adhering to modern Material principles.

- **Level 0 (Base):** The main background color.
- **Level 1 (Surface):** Used for cards and main content areas. Soft 1px borders in a neutral-variant color are preferred over shadows for high-density tables.
- **Level 2 (Overlay):** Used for dropdowns and popovers. These utilize a soft, diffused ambient shadow (10% opacity, 8px blur) to indicate elevation.

Floating Action Buttons (FABs) for "Create New Invoice" or "Print" should be the only elements with distinct elevation shadows to drive immediate interaction.

## Shapes
The shape language is **Soft**, utilizing a `0.25rem` (4px) base radius. This provides a professional, "exact" feel that aligns with the printing and precision theme, avoiding the overly casual nature of highly rounded corners.

- **Buttons/Inputs:** 4px radius.
- **Cards/Modals:** 8px (Large) radius.
- **Checkboxes:** 2px radius for a crisp, functional appearance.

## Components

### Input Fields & Business Forms
Inputs must accommodate specific Indian validation patterns.
- **GSTIN/PAN Fields:** Use a monospaced font variant within the input for character clarity. Always include a "Verify" action button for GSTIN fields.
- **State Selector:** Use a standardized dropdown list of Indian States/UTs to drive automatic SGST/IGST calculation logic.

### Invoicing & Tables
- **Data Rows:** Use zebra-striping or subtle dividers.
- **Currency Columns:** Right-aligned with the ₹ symbol.
- **Tax Breakdown:** Display CGST, SGST, and IGST in distinct sub-columns using the specific color tokens defined in the color section to help users audit taxes at a glance.

### Buttons
- **Primary:** Solid blue with white text.
- **Secondary:** Outlined blue.
- **Print Action:** Use a specialized "Print" icon variant with a secondary tonal background to differentiate it from standard "Save" actions.

### Localization Constants
- **Date Format:** All date pickers and displays must default to `DD-MM-YYYY`.
- **Currency Format:** Use `en-IN` locale settings for digit grouping (Lakhs and Crores).