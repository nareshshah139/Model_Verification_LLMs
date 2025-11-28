# Dashboard Visual Guide

## Dashboard Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Model Card: [path/to/model-card.docx]  [MD/DOCX]              │
│  [Verify Model Card] [Verify Notebooks]                         │
├─────────────────────────────────────────────────────────────────┤
│  [📊 Dashboard 14/20] [📄 Content] [✓ Verification]            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Model Card Claims Dashboard                                     │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │   20    │  │   14    │  │    4    │  │    2    │          │
│  │  Total  │  │Verified │  │ Partial │  │Not Ver. │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🎯 Materiality Impact Analysis                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │    0     │ │    2     │ │    4     │ │   14     │  │  │
│  │  │ Critical │ │   High   │ │  Medium  │ │   Low    │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  │                                                          │  │
│  │  Overall Risk Assessment: [LOW]                         │  │
│  │  Core technical claims are well-verified. Gaps are      │  │
│  │  mainly in regulatory/governance documentation...       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Executive Summary 5] [Purpose & Scope 14] [Key Outputs 1]    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ✅ claim_1  [Verified] [Low Impact]                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Model predicts Expected Loss (EL) for retail lending    │  │
│  │  portfolios at application time using historical data.   │  │
│  │                                                           │  │
│  │  ┌──────┐ ┌───────────┐ ┌──────────┐ ┌────────┐        │  │
│  │  │ 95%  │ │    15     │ │    3     │ │   0    │        │  │
│  │  │Conf. │ │Materiality│ │ Evidence │ │ Issues │        │  │
│  │  └──────┘ └───────────┘ └──────────┘ └────────┘        │  │
│  │                                                           │  │
│  │  Verification Notes:                                     │  │
│  │  Strong evidence found across multiple notebooks...     │  │
│  │                                                           │  │
│  │  Impact Reason: Fully verified                          │  │
│  │                                                           │  │
│  │  Code References:                                        │  │
│  │  [notebooks/4_lgd_ead_modeling.ipynb:Cell[75-83]]      │  │
│  │  [notebooks/1_data_cleaning_understanding.ipynb:Cell[0]]│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ⚠️ claim_5  [Partial] [Medium Impact]                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Credit policy is built on 10 PD-based risk classes     │  │
│  │  and an ROI floor...                                     │  │
│  │                                                           │  │
│  │  ┌──────┐ ┌───────────┐ ┌──────────┐ ┌────────┐        │  │
│  │  │ 72%  │ │    45     │ │    4     │ │   1    │        │  │
│  │  │Conf. │ │Materiality│ │ Evidence │ │ Issues │        │  │
│  │  └──────┘ └───────────┘ └──────────┘ └────────┘        │  │
│  │                                                           │  │
│  │  Verification Notes:                                     │  │
│  │  Credit policy shows risk classes and ROI floor but      │  │
│  │  implementation uses simplified binary/ROI approach...   │  │
│  │                                                           │  │
│  │  Impact Reason: Partially verified, Medium severity      │  │
│  │                                                           │  │
│  │  Issues & Contradictions:                                │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │ [MEDIUM] Implementation Simplification          │     │  │
│  │  │ 10 risk classes mentioned but implementation   │     │  │
│  │  │ uses simplified binary/ROI approach            │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  │                                                           │  │
│  │  Code References:                                        │  │
│  │  [notebooks/4_lgd_ead_modeling.ipynb:Cell[65,75-84]]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ❌ claim_16  [Not Verified] [High Impact]              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Portfolio exposure at monitoring date is $8.5 billion  │  │
│  │                                                           │  │
│  │  ┌──────┐ ┌───────────┐ ┌──────────┐ ┌────────┐        │  │
│  │  │ 25%  │ │    72     │ │    1     │ │   1    │        │  │
│  │  │Conf. │ │Materiality│ │ Evidence │ │ Issues │        │  │
│  │  └──────┘ └───────────┘ └──────────┘ └────────┘        │  │
│  │                                                           │  │
│  │  Verification Notes:                                     │  │
│  │  No explicit calculation of total portfolio exposure    │  │
│  │  found. Rough estimate doesn't match claimed $8.5B...   │  │
│  │                                                           │  │
│  │  Impact Reason: Not verified, Low confidence (25%)      │  │
│  │                                                           │  │
│  │  Issues & Contradictions:                                │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │ [MEDIUM] Missing Evidence                       │     │  │
│  │  │ Total portfolio exposure not calculated or      │     │  │
│  │  │ documented                                      │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Overall Assessment                                       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Summary:                                                 │  │
│  │  The model card claims are substantially supported by    │  │
│  │  the code implementation, with 14 out of 20 claims       │  │
│  │  fully verified and 4 partially verified...              │  │
│  │                                                           │  │
│  │  ✅ Strengths                    ⚠️ Gaps                │  │
│  │  • Core modeling claims          • CECL/ASC 326 not     │  │
│  │    fully verified                  implemented          │  │
│  │  • Data characteristics          • Stress testing not   │  │
│  │    well-documented                 found               │  │
│  │  • EL calculation clearly        • Portfolio exposure  │  │
│  │    implemented                     not verified        │  │
│  │                                                           │  │
│  │  ℹ️ Recommendations                                      │  │
│  │  • Document 12-month PD time horizon explicitly         │  │
│  │  • Add portfolio-level exposure calculations            │  │
│  │  • Consider implementing CECL compliance mechanisms     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Visual Elements

### 1. Summary Statistics Cards
```
┌─────────┐
│   20    │  ← Large, bold number
│  Total  │  ← Small label
└─────────┘
```

### 2. Materiality Impact Boxes
```
┌──────────┐
│    2     │  ← Count in colored box
│   High   │  ← Impact level
└──────────┘
    ↓
Background color indicates severity:
- Red: Critical
- Orange: High  
- Yellow: Medium
- Green: Low
```

### 3. Claim Status Icons
```
✅ Verified          → Green checkmark
⚠️ Partial          → Yellow warning
❌ Not Verified     → Red X
🔶 Insufficient     → Orange diamond
```

### 4. Status Badges
```
[Verified]         → Green badge
[Partial]          → Yellow badge
[Not Verified]     → Red badge
[Insufficient]     → Orange badge
```

### 5. Materiality Badges
```
[Low Impact]       → Green background, white text
[Medium Impact]    → Yellow background, white text
[High Impact]      → Orange background, white text
[Critical Impact]  → Red background, white text
```

### 6. Metrics Grid (4 columns)
```
┌──────┐ ┌───────────┐ ┌──────────┐ ┌────────┐
│ 95%  │ │    15     │ │    3     │ │   0    │
│Conf. │ │Materiality│ │ Evidence │ │ Issues │
└──────┘ └───────────┘ └──────────┘ └────────┘
```

### 7. Issue/Contradiction Boxes
```
┌────────────────────────────────────────────────┐
│ [MEDIUM] Implementation Simplification          │  ← Severity badge + type
│ 10 risk classes mentioned but implementation   │  ← Description
│ uses simplified binary/ROI approach            │
└────────────────────────────────────────────────┘
     ↑
Border color indicates severity:
- Red: High
- Yellow: Medium
- Blue: Low
```

### 8. Code Reference Tags
```
[notebooks/4_lgd_ead_modeling.ipynb:Cell[75-83]]
└─────────────────────────┬─────────────────────┘
            Clickable, monospace font badge
```

### 9. Category Tabs
```
[Executive Summary 5] [Purpose & Scope 14] [Key Outputs 1]
━━━━━━━━━━━━━━━━━━━
       ↑
  Active tab underlined
  Number shows claims count in that category
```

### 10. Assessment Section Layout
```
┌────────────────────────────────────┐
│  ✅ Strengths     ⚠️ Gaps          │
│  • Item           • Item           │
│  • Item           • Item           │
│  • Item           • Item           │
│                                    │
│  ℹ️ Recommendations                │
│  • Item                            │
│  • Item                            │
└────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (> 768px)
- Summary stats: 4 columns
- Materiality boxes: 4 columns
- Metrics grid: 4 columns
- Assessment: 2 columns (strengths/gaps side-by-side)

### Tablet (768px - 1024px)
- Summary stats: 2 columns
- Materiality boxes: 2 columns
- Metrics grid: 2 columns
- Assessment: 2 columns

### Mobile (< 768px)
- Summary stats: 2 columns
- Materiality boxes: 2 columns
- Metrics grid: 2 columns
- Assessment: 1 column (stacked)

## Color Palette

### Status Colors
- **Verified**: `bg-green-100 text-green-800 border-green-300`
- **Partial**: `bg-yellow-100 text-yellow-800 border-yellow-300`
- **Not Verified**: `bg-red-100 text-red-800 border-red-300`
- **Insufficient**: `bg-orange-100 text-orange-800 border-orange-300`

### Materiality Colors
- **Critical**: `bg-red-600 text-white`
- **High**: `bg-orange-500 text-white`
- **Medium**: `bg-yellow-500 text-white`
- **Low**: `bg-green-500 text-white`

### Severity Colors (Issues)
- **High**: `bg-red-50 border-red-500` (light background, colored border)
- **Medium**: `bg-yellow-50 border-yellow-500`
- **Low**: `bg-blue-50 border-blue-500`

### Interactive Elements
- Hover on cards: `hover:shadow-lg transition-shadow`
- Active tabs: Underlined with primary color
- Buttons: Standard button styles with icons

## Spacing & Typography

### Spacing
- Card padding: `p-4` to `p-6`
- Gap between elements: `gap-4` (1rem)
- Section spacing: `space-y-4` to `space-y-6`

### Typography
- Page title: `text-2xl font-bold`
- Card titles: `text-base font-semibold`
- Section headings: `text-sm font-semibold`
- Body text: `text-sm text-muted-foreground`
- Metrics: `text-3xl font-bold` or `text-2xl font-bold`
- Labels: `text-xs text-muted-foreground`
- Code references: `font-mono text-xs`

## Scrolling Behavior

```
┌─────────────────────────────────────┐
│  Header (Fixed)                     │
├─────────────────────────────────────┤
│  Tabs (Fixed)                       │
├─────────────────────────────────────┤
│                                     │
│  ↕️ Scrollable Content Area         │
│                                     │
│  - Summary stats                    │
│  - Materiality analysis             │
│  - Claim cards                      │
│  - Overall assessment               │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

- Header and tabs remain fixed at top
- Content area scrolls independently
- Smooth scrolling with `ScrollArea` component

## Interactive Features

1. **Tab Navigation**: Click tabs to switch between claim categories
2. **Expandable Details**: Some sections have `<details>` tags for expansion
3. **Badge Information**: Hover for tooltips (if implemented)
4. **Code References**: Could be made clickable to jump to files
5. **Clear Log Button**: In verification tab to clear progress messages

## Accessibility Features

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast color combinations
- Icon + text labels (not icon-only)
- Descriptive alt text

## Print/Export View

For printing or screenshots:
- All content expands (no scrolling needed)
- Color scheme adjusts for print media
- Page breaks at logical sections
- Headers repeat on each page

---

This visual guide helps you understand the dashboard layout before you see it in the browser!

