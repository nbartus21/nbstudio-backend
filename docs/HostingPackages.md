# Hosting Package Management System

This document outlines the hosting package management system implementation for NB Studio.

## Features

- **Admin Management Interface**: Create, edit, and manage hosting packages
- **Multi-language Support**: Content in English, German and Hungarian
- **Package Types**: Support for both regular hosting and reseller hosting packages
- **Pricing Control**: Set different prices for monthly and annual billing cycles
- **Resource Management**: Define storage, bandwidth, domains, databases, and account limits
- **Display Order**: Control the display order of packages on the public website
- **WHMCS Integration**: Connect packages to WHMCS product IDs for seamless order processing

## Components

### Backend

1. **Models**:
   - `HostingPackage.js`: Schema for hosting package data
   - `Hosting.js`: Schema for customer hosting orders

2. **Routes**:
   - `hostingPackages.js`: Admin API endpoints for package management
   - `publicHosting.js`: Public-facing API endpoints
   - `hosting.js`: Existing routes for processing customer orders

### Frontend

1. **Admin Components**:
   - `HostingPackagesAdmin.jsx`: Package management interface for administrators
   - `HostingManager.jsx`: Existing interface for managing customer orders

2. **Public Components**:
   - `HostingPackagesDisplay.jsx`: Displays packages to potential customers
   - `WebhostingOrder.jsx`: Order form for customers to purchase packages

3. **Services**:
   - `hostingPackageService.js`: API service functions for interacting with packages

## Data Structure

Each hosting package includes:

- **Basic Information**: name, type (regular/reseller), active status
- **Multi-language Content**: 
  - Description in EN, DE, HU
  - Features list in EN, DE, HU
- **Pricing**: Monthly and annual prices
- **Resources**:
  - Storage (GB)
  - Bandwidth (GB)
  - Domains count
  - Databases count
  - Accounts count
- **Integration**: WHMCS product ID
- **Display Order**: Controls the order packages appear on the frontend

## Order Flow

1. Customer views available packages on the website
2. Customer selects a package and billing cycle
3. Customer enters their information and domain details
4. Order is created in the system with status "new"
5. Admin reviews the order in HostingManager
6. Admin can approve, process, or reject the order
7. If approved, the system creates the account in WHMCS and activates the service

## WHMCS Integration

The system uses predefined WHMCS product IDs that correspond to each hosting package:

### Regular Hosting:
- Starter: ID 1
- Business: ID 2
- Professional: ID 3

### Reseller Hosting:
- Starter: ID 4
- Business: ID 5
- Professional: ID 6

These IDs are configured in `HostingManager.jsx` in the `WHMCS_CONFIG` object.

## Styling

The system uses TailwindCSS for styling with a consistent color scheme:
- Regular Hosting: Blue theme
- Reseller Hosting: Purple theme
- Active Controls: Green elements
- Error States: Red elements

## Translations

All customer-facing text is available in three languages:
- English (en)
- German (de)
- Hungarian (hu)

The language selection is passed as a prop to the components.