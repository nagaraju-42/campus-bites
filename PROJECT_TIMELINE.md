# CampusBites Project Timeline

🌳 **Project Evolution Tree**

## Phase 1: Foundation
├── Database Setup
│   ├── Authentication & User Profiles
│   ├── Shops & Menu Items schema
│   ├── Orders & Order Items schema
│   └── RLS Policies (Row Level Security)
├── Core Frontend
│   ├── Next.js Application Scaffold
│   └── Tailwind CSS Configuration

## Phase 2: Role-Based Dashboards
├── Student (Customer) Experience
│   └── Shop Browsing & Ordering
├── Shop Owner Dashboard
│   ├── Order Management
│   └── Menu Editing
├── Rider Dashboard
│   └── Delivery Assignments
└── System Admin Panel
    └── Centralized Shop & User Management

## Phase 3: Enhancements & Fixes (Today)
├── Admin Panel Refinements
│   ├── Fixed Database Schema Mismatches
│   │   ├── Added `is_veg` column to `menu_items`
│   │   ├── Added `category_id` relational reference
│   │   └── Removed strict `NOT NULL` from old `category`
│   ├── RLS Policy Updates
│   │   └── Explicitly added `WITH CHECK` to allow Admin inserts
│   └── Super Admin Menu UI Updates
│       ├── Added "Pure Veg" toggle to the Edit Item form
│       ├── Fixed NaN error when clearing Price input
│       ├── Built `/api/image-size` internal Next.js API route
│       └── Integrated `<ImageSizeBadge />` to fetch and show image file sizes dynamically
└── Project Migrations
    ├── Full SQL Database Dump generation
    └── Removed direct DB credentials from codebase (SQL-Editor only mode)

---
*Future updates will grow sequentially from this tree.*
