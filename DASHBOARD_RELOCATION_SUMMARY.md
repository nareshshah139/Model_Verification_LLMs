# Claims Dashboard Relocation - Summary

## What Changed

The Claims Dashboard has been **moved from the Model Card Viewer** to the **main Dashboard page** (next to notebooks), as requested.

## Changes Made

### ✅ 1. Created New Components

#### **`apps/api/components/dashboard/claims-summary.tsx`**
- Summary card showing quick overview of claims status
- Displays: Verified, Partial, Not Verified, and Pending counts
- Shows risk level badge (HIGH/MEDIUM/LOW)
- Includes "View Full Dashboard" button
- Loads data from JSON files automatically

#### **`apps/api/app/dashboard/claims/page.tsx`**
- Full-page claims dashboard
- Same comprehensive dashboard that was in the Model Card Viewer tab
- Accessible via `/dashboard/claims` route
- Includes navigation back to main dashboard and workspace

### ✅ 2. Updated Dashboard Page

**`apps/api/app/dashboard/page.tsx`**
- Added `ClaimsSummary` component
- Positioned below "Model Card Verification" section
- Positioned above "Project Overview" section

### ✅ 3. Cleaned Up Model Card Viewer

**`apps/api/components/workspace/model-card-viewer.tsx`**
- ❌ Removed Dashboard tab completely
- ❌ Removed "14/98" badge (no longer shows until clicked)
- ❌ Removed claims/verification data loading
- ❌ Removed ClaimsDashboard import
- ✅ Now only has Content and Verification tabs

## New User Flow

### Before (Old):
```
Model Card Viewer
├── Dashboard tab (14/98) ← Showed badge immediately
├── Content tab
└── Verification tab
```

### After (New):
```
Main Dashboard Page (/dashboard)
├── Model Card Verification (existing)
├── Model Card Claims Analysis (NEW!)
│   ├── Quick summary cards
│   ├── Risk level badge
│   └── "View Full Dashboard" button → /dashboard/claims
└── Project Overview

Model Card Viewer
├── Content tab
└── Verification tab (No dashboard tab)

New Claims Dashboard Page (/dashboard/claims)
└── Full comprehensive claims dashboard
```

## How to Access

### 1. From Main Dashboard:
```
1. Navigate to /dashboard
2. See "Model Card Claims Analysis" card
3. View summary: Verified, Partial, Not Verified, Pending
4. Click "View Full Dashboard" button
5. Opens full claims dashboard at /dashboard/claims
```

### 2. Direct URL:
```
Navigate directly to: http://localhost:3000/dashboard/claims
```

## What You'll See

### On Main Dashboard (`/dashboard`):

**Model Card Claims Analysis Card:**
```
┌─────────────────────────────────────────────────────┐
│ Model Card Claims Analysis    [LOW RISK]           │
│ 14 of 98 claims verified       [View Full Dashboard]│
├─────────────────────────────────────────────────────┤
│  [14 Verified] [4 Partial] [2 Not Ver.] [78 Pending]│
│     (green)      (yellow)     (red)      (orange)   │
└─────────────────────────────────────────────────────┘
```

### On Claims Dashboard Page (`/dashboard/claims`):

Full comprehensive dashboard with:
- Summary statistics (Total, Verified, Partial, Not Verified)
- Materiality impact analysis (Critical/High/Medium/Low)
- Overall risk assessment
- Claims by category (tabbed interface)
- Detailed claim cards with evidence and issues
- Overall assessment (strengths, gaps, recommendations)

## Key Benefits

✅ **No Badge Until Clicked**: Badge doesn't show in Model Card Viewer anymore  
✅ **Dedicated Page**: Full claims dashboard has its own page  
✅ **Better Organization**: Dashboard features are now in the dashboard section  
✅ **Quick Access**: Summary card on main dashboard for at-a-glance view  
✅ **Clean Separation**: Model Card Viewer focuses on content/verification only  

## File Structure

```
apps/api/
├── app/
│   └── dashboard/
│       ├── page.tsx                          ← Updated (added ClaimsSummary)
│       └── claims/
│           └── page.tsx                      ← NEW (full dashboard page)
└── components/
    ├── dashboard/
    │   ├── verification-summary.tsx          ← Existing
    │   └── claims-summary.tsx                ← NEW (summary card)
    └── workspace/
        ├── claims-dashboard.tsx              ← Existing (reused on new page)
        └── model-card-viewer.tsx             ← Updated (removed dashboard tab)
```

## Testing

To test the new flow:

```bash
# Start the application
cd apps/api
npm run dev

# In browser:
1. Navigate to http://localhost:3000/dashboard
2. Scroll down to "Model Card Claims Analysis" card
3. View the summary statistics
4. Click "View Full Dashboard" button
5. Full claims dashboard opens at /dashboard/claims
6. Navigate back using "Back to Dashboard" button

# Verify Model Card Viewer:
1. Go to /workspace
2. Open a model card
3. Confirm: Only "Content" and "Verification" tabs (no Dashboard tab)
4. Confirm: No "14/98" badge showing
```

## Summary

**✅ Dashboard tab moved from Model Card Viewer to main Dashboard page**  
**✅ No "14/98" badge showing until you click to view dashboard**  
**✅ Summary card shows quick overview on main dashboard**  
**✅ Full dashboard accessible via dedicated page at `/dashboard/claims`**  
**✅ Clean separation between model card viewing and claims analysis**  

The claims dashboard is now properly integrated into the dashboard section where it belongs! 🎯

