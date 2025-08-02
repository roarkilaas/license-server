// server.js - License server with SQLite
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
let db;

async function initDatabase() {
    // Open SQLite database
    db = await open({
        filename: process.env.DB_PATH || './license.db',
        driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');
    
    // Create tables
    await createTables();
    
    console.log('✅ SQLite database initialized');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';
const LICENSE_STATUSES = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended',
    REVOKED: 'revoked'
};

// ============================================
// DATABASE SCHEMA CREATION
// ============================================

async function createTables() {
    // Create licenses table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS licenses (
            id TEXT PRIMARY KEY,
            license_key TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            customer_email TEXT,
            issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            expiry_date DATETIME NOT NULL,
            max_activations INTEGER DEFAULT 1,
            current_activations INTEGER DEFAULT 0,
            features TEXT DEFAULT '[]',
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')),
            metadata TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create activations table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS activations (
            id TEXT PRIMARY KEY,
            license_id TEXT NOT NULL,
            machine_fingerprint TEXT NOT NULL,
            activation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,
            client_info TEXT DEFAULT '{}',
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
            UNIQUE(license_id, machine_fingerprint)
        )
    `);

    // Create products table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            version TEXT,
            features TEXT DEFAULT '[]',
            default_max_activations INTEGER DEFAULT 1,
            default_validity_days INTEGER DEFAULT 365,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create customers table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            company TEXT,
            phone TEXT,
            address TEXT,
            metadata TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create audit log table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS license_audit_log (
            id TEXT PRIMARY KEY,
            license_id TEXT,
            action TEXT NOT NULL,
            machine_fingerprint TEXT,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT DEFAULT '{}',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (license_id) REFERENCES licenses(id)
        )
    `);

    // Create indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_licenses_customer_id ON licenses(customer_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON licenses(product_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_activations_license_id ON activations(license_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_activations_machine_fingerprint ON activations(machine_fingerprint)`);

    // Insert sample data if tables are empty
    await insertSampleData();
}

async function insertSampleData() {
    const licenseCount = await db.get('SELECT COUNT(*) as count FROM licenses');
    
    if (licenseCount.count === 0) {
        console.log('📝 Inserting sample data...');
        
        // Insert sample products
        await db.run(`
            INSERT INTO products (id, name, description, features, default_max_activations) VALUES
            ('MYAPP_PRO', 'MyApp Professional', 'Professional version with advanced features', 
             '["advanced_reporting", "api_access", "premium_support"]', 3),
            ('MYAPP_BASIC', 'MyApp Basic', 'Basic version with standard features', 
             '["basic_features", "standard_support"]', 1)
        `);

        // Insert sample customers
        await db.run(`
            INSERT INTO customers (id, name, email, company) VALUES
            ('CUST001', 'John Doe', 'john@example.com', 'Example Corp'),
            ('CUST002', 'Jane Smith', 'jane@testcompany.com', 'Test Company Ltd')
        `);

        // Insert sample licenses
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year from now

        await db.run(`
            INSERT INTO licenses (id, license_key, product_id, customer_id, expiry_date, max_activations, features) VALUES
            ('lic1', 'AAAA-BBBB-CCCC-DDDD', 'MYAPP_PRO', 'CUST001', ?, 3, '["advanced_reporting", "api_access", "premium_support"]'),
            ('lic2', 'EEEE-FFFF-GGGG-HHHH', 'MYAPP_BASIC', 'CUST002', ?, 1, '["basic_features", "standard_support"]')
        `, [expiryDate.toISOString(), expiryDate.toISOString()]);

        console.log('✅ Sample data inserted');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

function generateLicenseKey() {
    const segments = [];
    for (let i = 0; i < 4; i++) {
        segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return segments.join('-');
}

function hashMachineId(machineId) {
    return crypto.createHash('sha256').update(machineId).digest('hex');
}

function signResponse(data) {
    return jwt.sign(data, JWT_SECRET, { expiresIn: '1h' });
}

function verifySignature(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

class LicenseDatabase {
    // Get license by key
    static async getLicense(licenseKey) {
        return await db.get(
            'SELECT * FROM licenses WHERE license_key = ?',
            [licenseKey]
        );
    }

    // Get activation by license and machine
    static async getActivation(licenseId, machineFingerprint) {
        return await db.get(
            'SELECT * FROM activations WHERE license_id = ? AND machine_fingerprint = ?',
            [licenseId, machineFingerprint]
        );
    }

    // Create new activation
    static async createActivation(licenseId, machineFingerprint, clientInfo = {}) {
        const id = generateId();
        const now = new Date().toISOString();
        
        await db.run(`
            INSERT INTO activations (
                id, license_id, machine_fingerprint, 
                activation_date, last_heartbeat, client_info
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            id,
            licenseId, 
            machineFingerprint, 
            now,
            now,
            JSON.stringify(clientInfo)
        ]);

        return await db.get('SELECT * FROM activations WHERE id = ?', [id]);
    }

    // Update heartbeat
    static async updateHeartbeat(activationId) {
        await db.run(
            'UPDATE activations SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = ?',
            [activationId]
        );
    }

    // Update activation count
    static async updateActivationCount(licenseId, increment = true) {
        const operator = increment ? '+' : '-';
        await db.run(
            `UPDATE licenses SET current_activations = current_activations ${operator} 1 WHERE id = ?`,
            [licenseId]
        );
    }

    // Create new license
    static async createLicense(data) {
        const id = generateId();
        const licenseKey = generateLicenseKey();
        const now = new Date().toISOString();
        
        await db.run(`
            INSERT INTO licenses (
                id, license_key, product_id, customer_id,
                issue_date, expiry_date, max_activations,
                current_activations, features, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `, [
            id,
            licenseKey,
            data.product_id,
            data.customer_id,
            now,
            data.expiry_date,
            data.max_activations || 1,
            JSON.stringify(data.features || []),
            LICENSE_STATUSES.ACTIVE
        ]);

        return await db.get('SELECT * FROM licenses WHERE id = ?', [id]);
    }

    // Remove activation
    static async removeActivation(licenseId, machineFingerprint) {
        const result = await db.run(
            'DELETE FROM activations WHERE license_id = ? AND machine_fingerprint = ?',
            [licenseId, machineFingerprint]
        );
        return result.changes > 0;
    }

    // Log audit event
    static async logAudit(licenseId, action, machineFingerprint = null, details = {}) {
        await db.run(`
            INSERT INTO license_audit_log (id, license_id, action, machine_fingerprint, details)
            VALUES (?, ?, ?, ?, ?)
        `, [
            generateId(),
            licenseId,
            action,
            machineFingerprint,
            JSON.stringify(details)
        ]);
    }
}

// ============================================
// LICENSE VALIDATION LOGIC
// ============================================

class LicenseValidator {
    static validateLicense(license) {
        const now = new Date();
        const expiryDate = new Date(license.expiry_date);

        // Check if license exists
        if (!license) {
            return { valid: false, reason: 'License not found' };
        }

        // Check status
        if (license.status !== LICENSE_STATUSES.ACTIVE) {
            return { valid: false, reason: `License is ${license.status}` };
        }

        // Check expiry
        if (expiryDate < now) {
            return { valid: false, reason: 'License has expired' };
        }

        return { valid: true };
    }

    static async processValidation(licenseKey, machineId, clientInfo = {}) {
        try {
            const hashedMachineId = hashMachineId(machineId);
            
            // Get license
            const license = await LicenseDatabase.getLicense(licenseKey);
            if (!license) {
                return {
                    valid: false,
                    reason: 'Invalid license key',
                    code: 'LICENSE_NOT_FOUND'
                };
            }

            // Validate license
            const validation = this.validateLicense(license);
            if (!validation.valid) {
                await LicenseDatabase.logAudit(license.id, 'validation_failed', hashedMachineId, {
                    reason: validation.reason
                });
                return {
                    valid: false,
                    reason: validation.reason,
                    code: 'LICENSE_INVALID'
                };
            }

            // Check existing activation
            let activation = await LicenseDatabase.getActivation(license.id, hashedMachineId);
            
            if (!activation) {
                // Check if we can create new activation
                if (license.current_activations >= license.max_activations) {
                    await LicenseDatabase.logAudit(license.id, 'activation_rejected', hashedMachineId, {
                        reason: 'max_activations_reached'
                    });
                    return {
                        valid: false,
                        reason: 'Maximum activations reached',
                        code: 'MAX_ACTIVATIONS'
                    };
                }

                // Create new activation
                activation = await LicenseDatabase.createActivation(
                    license.id, 
                    hashedMachineId, 
                    clientInfo
                );
                await LicenseDatabase.updateActivationCount(license.id, true);
                await LicenseDatabase.logAudit(license.id, 'activated', hashedMachineId, clientInfo);
            } else {
                // Update existing activation heartbeat
                await LicenseDatabase.updateHeartbeat(activation.id);
                await LicenseDatabase.logAudit(license.id, 'validated', hashedMachineId, clientInfo);
            }

            // Parse features (stored as JSON string)
            let features = [];
            try {
                features = JSON.parse(license.features || '[]');
            } catch (e) {
                features = [];
            }

            return {
                valid: true,
                license_key: license.license_key,
                product_id: license.product_id,
                expiry: Math.floor(new Date(license.expiry_date).getTime() / 1000),
                features: features,
                activation_id: activation.id,
                max_activations: license.max_activations,
                current_activations: license.current_activations + (activation ? 0 : 1)
            };

        } catch (error) {
            console.error('Validation error:', error);
            return {
                valid: false,
                reason: 'Internal server error',
                code: 'SERVER_ERROR'
            };
        }
    }
}

// ============================================
// API ROUTES
// ============================================

// License validation endpoint
app.post('/api/license/validate', async (req, res) => {
    const { license_key, machine_id, timestamp, client_info } = req.body;

    // Basic validation
    if (!license_key || !machine_id) {
        return res.status(400).json({
            valid: false,
            reason: 'Missing required fields',
            code: 'MISSING_FIELDS'
        });
    }

    // Optional: Timestamp validation (prevent replay attacks)
    if (timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const timeDiff = Math.abs(now - timestamp);
        if (timeDiff > 300) { // 5 minutes tolerance
            return res.status(400).json({
                valid: false,
                reason: 'Request timestamp too old',
                code: 'TIMESTAMP_INVALID'
            });
        }
    }

    const result = await LicenseValidator.processValidation(
        license_key, 
        machine_id, 
        client_info || {}
    );

    // Sign the response
    if (result.valid) {
        result.signature = signResponse(result);
    }

    res.json(result);
});

// License status check (for admin)
app.get('/api/license/status/:license_key', async (req, res) => {
    const { license_key } = req.params;
    
    try {
        const license = await LicenseDatabase.getLicense(license_key);
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        const activations = await db.all(
            'SELECT machine_fingerprint, activation_date, last_heartbeat FROM activations WHERE license_id = ?',
            [license.id]
        );

        // Parse features
        let features = [];
        try {
            features = JSON.parse(license.features || '[]');
        } catch (e) {
            features = [];
        }

        res.json({
            license_key: license.license_key,
            product_id: license.product_id,
            customer_id: license.customer_id,
            status: license.status,
            issue_date: license.issue_date,
            expiry_date: license.expiry_date,
            max_activations: license.max_activations,
            current_activations: license.current_activations,
            features: features,
            activations: activations
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new license (admin endpoint)
app.post('/api/license/create', async (req, res) => {
    const { 
        product_id, 
        customer_id, 
        expiry_date, 
        max_activations, 
        features 
    } = req.body;

    if (!product_id || !customer_id || !expiry_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const license = await LicenseDatabase.createLicense({
            product_id,
            customer_id,
            expiry_date,
            max_activations: max_activations || 1,
            features: features || []
        });

        // Parse features for response
        let parsedFeatures = [];
        try {
            parsedFeatures = JSON.parse(license.features || '[]');
        } catch (e) {
            parsedFeatures = [];
        }

        res.json({
            license_key: license.license_key,
            product_id: license.product_id,
            customer_id: license.customer_id,
            expiry_date: license.expiry_date,
            max_activations: license.max_activations,
            features: parsedFeatures
        });
    } catch (error) {
        console.error('License creation error:', error);
        res.status(500).json({ error: 'Failed to create license' });
    }
});

// Deactivate license on specific machine
app.post('/api/license/deactivate', async (req, res) => {
    const { license_key, machine_id } = req.body;

    if (!license_key || !machine_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const hashedMachineId = hashMachineId(machine_id);
        const license = await LicenseDatabase.getLicense(license_key);
        
        if (!license) {
            return res.status(404).json({ error: 'License not found' });
        }

        const removed = await LicenseDatabase.removeActivation(license.id, hashedMachineId);
        if (removed) {
            await LicenseDatabase.updateActivationCount(license.id, false);
            await LicenseDatabase.logAudit(license.id, 'deactivated', hashedMachineId);
            res.json({ success: true, message: 'License deactivated' });
        } else {
            res.status(404).json({ error: 'Activation not found' });
        }
    } catch (error) {
        console.error('Deactivation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'SQLite'
    });
});

// Database info endpoint (for debugging)
app.get('/api/debug/database', async (req, res) => {
    try {
        const licenseCount = await db.get('SELECT COUNT(*) as count FROM licenses');
        const activationCount = await db.get('SELECT COUNT(*) as count FROM activations');
        
        res.json({
            database_type: 'SQLite',
            database_path: process.env.DB_PATH || './license.db',
            licenses: licenseCount.count,
            activations: activationCount.count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 License server running on port ${PORT}`);
            console.log(`📄 Health check: http://localhost:${PORT}/health`);
            console.log(`🗄️  Database: SQLite (${process.env.DB_PATH || './license.db'})`);
            console.log(`🔍 Debug info: http://localhost:${PORT}/api/debug/database`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;