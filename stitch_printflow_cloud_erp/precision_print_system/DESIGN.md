---
name: Precision Print System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#414754'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#727785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005bc0'
  primary: '#005bbf'
  on-primary: '#ffffff'
  primary-container: '#1a73e8'
  on-primary-container: '#ffffff'
  inverse-primary: '#adc7ff'
  secondary: '#4442e3'
  on-secondary: '#ffffff'
  secondary-container: '#5f5ffd'
  on-secondary-container: '#fffbff'
  tertiary: '#9e4300'
  on-tertiary: '#ffffff'
  tertiary-container: '#c55500'
  on-tertiary-container: '#0e0200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#e1dfff'
  secondary-fixed-dim: '#c1c1ff'
  on-secondary-fixed: '#09006b'
  on-secondary-fixed-variant: '#2c24ce'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783100'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  status-new: '#9E9E9E'
  status-design: '#FBC02D'
  status-printing: '#1A73E8'
  status-outsource: '#9C27B0'
  status-finishing: '#EF6C00'
  status-ready: '#4CAF50'
  status-delivered: '#1B5E20'
  status-alert: '#D32F2F'
  border-subtle: '#E0E0E0'
  surface-sidebar: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-mono:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar-width: 240px
  sidebar-collapsed: 64px
  container-margin: 24px
  gutter: 16px
  cell-padding-v: 12px
  cell-padding-h: 16px
  stack-gap: 8px
---

## Brand & Style

This design system is engineered for the high-velocity environment of printing and signage manufacturing. The brand personality is **utilitarian, efficient, and reliable**, focusing on operational clarity over decorative flair.

The aesthetic follows a **Modern Corporate** style, drawing heavily from Material Design principles. It prioritizes information density and logical grouping, ensuring that complex production workflows remain legible. The visual language uses subtle elevation, clear containment, and a strict color-coded status system to provide immediate cognitive shortcuts for floor managers and designers. The interface is "tool-first," treating every screen as a functional workspace rather than a marketing surface.

## Colors

The palette is anchored by a functional **Primary Blue** (#1A73E8) for actions and navigation. The background architecture utilizes a clean **White and Off-White** hierarchy to reduce eye strain during long shifts.

The most critical aspect of the color system is the **Production Status Palette**. These colors must be used consistently across Kanban cards, table rows, and KPI badges to indicate the current phase of a print job. Secondary brand colors from the reference (#6161FF) are reserved for specialized platform features or integration highlights to differentiate them from core production statuses.

## Typography

**Inter** is the sole typeface, chosen for its exceptional legibility in data-heavy environments and its neutral, professional tone. 

The system uses a tight scale to maximize screen real estate. **Data-tabular** settings (tabular figures) should be applied to all numerical values in tables and quote summaries to ensure vertical alignment of digits. Labels for production statuses and technical specifications use a slightly smaller, semi-bold treatment to remain distinct from editable body text.

## Layout & Spacing

This design system employs a **Desktop-First, Sidebar-Driven** layout. The primary navigation is a persistent left-hand sidebar that can be collapsed to icons only for power users.

The content area follows a **Fluid Grid** model with a standard 12-column structure for dashboard views. For data tables and Kanban boards, the system prioritizes "Information Density." Spacing is tight (8px/16px increments) to allow for the maximum amount of visible data without scrolling. KPI cards are arranged in a horizontal scrollable or wrapping row at the top of main views to provide instant health checks of the production floor.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Low-Contrast Outlines**. 

- **Level 0 (Background):** #F8F9FA.
- **Level 1 (Surface):** White cards (#FFFFFF) with a 1px border (#E0E0E0). No shadows are used for standard containers to keep the UI "flat" and fast.
- **Level 2 (Interactive/Floating):** Modals and dropdowns use a soft ambient shadow (0px 4px 12px rgba(0,0,0,0.08)) to indicate they are temporary overlays.
- **Kanban Depth:** Dragged cards receive a momentary elevation increase with a medium shadow to signify they are active in the layout.

## Shapes

The shape language is **Soft (0.25rem/4px)**. This subtle rounding provides a modern touch while maintaining the professional, structured feel of a manufacturing tool.

Buttons and input fields share this 4px radius. Status chips and small badges may use a slightly more rounded 8px (rounded-lg) radius to distinguish them from interactive buttons, creating a visual difference between "things you can click" and "things that tell you information."

## Components

### Buttons & Inputs
Buttons use high-contrast fills for primary actions (Primary Blue) and ghost styles for secondary actions. Input fields must have clearly defined borders (#E0E0E0) and use a blue focus ring (2px) to signify active state.

### KPI Cards
Cards at the top of the dashboard should feature a large "Display" font size for the value and a small "Label-Bold" for the metric name. A small colored indicator bar on the left of the card should correspond to the relevant production status.

### Data Tables
Tables are the heart of the ERP. Use a 12px vertical padding for rows to balance density and legibility. Row hovering should trigger a subtle gray background (#F1F3F4). Status columns should use the full-color chips defined in the Colors section.

### Kanban Board
Kanban cards are "Surface" level containers. Each card must include the Job ID, Client Name, and a progress bar or deadline indicator. The header of each Kanban column should be color-coded based on the Status Palette.

### Sidebar Navigation
The sidebar should use a slightly darker or purely white background with active links highlighted by a primary-blue left-border strip and a tinted background fill (Primary Blue at 8% opacity).