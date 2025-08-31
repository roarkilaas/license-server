# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a software license management server built with Node.js, Express, and SQLite. It provides license generation, validation, activation, and deactivation functionality with a web-based admin dashboard.

## Architecture

### Core Components

- **server.js** - Main Express server with REST API endpoints for license operations
- **admin_tools.js** - Command-line admin interface (ServerCompatibleAdmin class) for license management
- **gui_server.js** - Web-based GUI server that provides a dashboard interface using the admin tools
- **setup_database.js** - Database initialization and migration utilities
- **license.db** - SQLite database storing customers, licenses, and activations

### Database Schema

The system uses SQLite with three main tables:
- `customers` - Customer information with emails and optional company data  
- `licenses` - License records with keys, types, expiration dates, and activation limits
- `activations` - Active license instances tied to specific machines/hardware

### Server Architecture

Two server modes available:
1. **API Server** (`server.js`) - REST API for license operations
2. **GUI Server** (`gui_server.js`) - Web dashboard with admin functionality

Both servers use the same database and admin tools but serve different interfaces.

## Development Commands

### Running the Application
```bash
npm start              # Start the main server (server.js)
npm run dev            # Start with nodemon for development
node gui_server.js     # Start the GUI dashboard server
```

### Database Operations
```bash
npm run backup         # Create timestamped backup of license.db
npm run reset-db       # Delete database and reinitialize
node setup_database.js # Run database setup/migration
node admin_tools.js    # Interactive CLI for license management
```

### Testing
```bash
npm test              # Run Jest tests
node test_client.js   # Run manual client tests
```

## Configuration

Environment variables are configured in `.env`:
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT signing secret for authentication
- `DB_PATH` - SQLite database file path (default: ./license.db)  
- `NODE_ENV` - Environment setting

## Key Features

### License Management
- Generate licenses with customizable expiration dates and activation limits
- Hardware fingerprint-based activation system
- License validation and renewal capabilities
- Bulk operations for customer and license management

### Security
- Helmet.js security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- JWT-based authentication for admin operations
- Hardware fingerprinting for license binding

### Admin Interface
- Command-line tools in `admin_tools.js` with interactive menus
- Web dashboard at `/dashboard.html` with real-time statistics
- License activation monitoring and management
- Customer database management

## Database Migrations

Use the migration scripts when schema changes are needed:
- `migrate_license_type.js` - Add license type field to existing records
- `migrate_customer_emails.js` - Update customer email handling

## File Structure Notes

- `public/` - Static files for web dashboard (HTML, CSS, JS)
- `Earlier stuff/` - Archive of previous versions  
- `direct_admin_tools.js` - Alternative admin interface implementation
- `test.html` - Manual testing interface for license operations