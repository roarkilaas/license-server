// setup_database.js - Complete database setup and migration script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'license_manager.db');

class DatabaseSetup {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📁 Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('📁 Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    async tableExists(tableName) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                [tableName],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(!!row);
                    }
                }
            );
        });
    }

    async columnExists(tableName, columnName) {
        return new Promise((resolve, reject) => {
            this.db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                if (err) {
                    reject(err);
                } else {
                    const hasColumn = columns.some(col => col.name === columnName);
                    resolve(hasColumn);
                }
            });
        });
    }

    async runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes, lastID: this.lastID });
                }
            });
        });
    }

    async createCustomersTable() {
        const exists = await this.tableExists('customers');
        if (exists) {
            console.log('✅ customers table already exists');
            return;
        }

        console.log('🔄 Creating customers table...');
        await this.runQuery(`
            CREATE TABLE customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                company TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ customers table created');
    }

    async createProductsTable() {
        const exists = await this.tableExists('products');
        if (exists) {
            console.log('✅ products table already exists');
            return;
        }

        console.log('🔄 Creating products table...');
        await this.runQuery(`
            CREATE TABLE products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                version TEXT,
                description TEXT,
                default_max_activations INTEGER DEFAULT 1,
                features TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ products table created');
    }

    async createLicensesTable() {
        const exists = await this.tableExists('licenses');
        if (exists) {
            console.log('✅ licenses table already exists');
            return;
        }

        console.log('🔄 Creating licenses table...');
        await this.runQuery(`
            CREATE TABLE licenses (
                license_key TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                license_type TEXT DEFAULT 'machine',
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expiry_date DATETIME,
                max_activations INTEGER DEFAULT 1,
                current_activations INTEGER DEFAULT 0,
                features TEXT,
                FOREIGN KEY (product_id) REFERENCES products (id),
                FOREIGN KEY (customer_id) REFERENCES customers (id)
            )
        `);
        console.log('✅ licenses table created');
    }

    async createActivationsTable() {
        const exists = await this.tableExists('activations');
        if (exists) {
            console.log('✅ activations table already exists');
            return;
        }

        console.log('🔄 Creating activations table...');
        await this.runQuery(`
            CREATE TABLE activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_key TEXT NOT NULL,
                machine_fingerprint TEXT NOT NULL,
                machine_name TEXT,
                activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (license_key) REFERENCES licenses (license_key),
                UNIQUE(license_key, machine_fingerprint)
            )
        `);
        console.log('✅ activations table created');
    }

    async createAuditLogTable() {
        const exists = await this.tableExists('audit_log');
        if (exists) {
            console.log('✅ audit_log table already exists');
            return;
        }

        console.log('🔄 Creating audit_log table...');
        await this.runQuery(`
            CREATE TABLE audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                action TEXT NOT NULL,
                license_key TEXT,
                machine_fingerprint TEXT,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT
            )
        `);
        console.log('✅ audit_log table created');
    }

    async addLicenseTypeColumn() {
        const exists = await this.columnExists('licenses', 'license_type');
        if (exists) {
            console.log('✅ license_type column already exists');
            return;
        }

        console.log('🔄 Adding license_type column to licenses table...');
        await this.runQuery(`ALTER TABLE licenses ADD COLUMN license_type TEXT DEFAULT 'machine'`);
        
        // Update existing licenses
        await this.runQuery(`UPDATE licenses SET license_type = 'machine' WHERE license_type IS NULL`);
        console.log('✅ license_type column added and existing licenses updated');
    }

    async addMissingColumns() {
        // Check and add any other missing columns that might be needed
        
        // Add features column to licenses if missing
        const hasFeaturesColumn = await this.columnExists('licenses', 'features');
        if (!hasFeaturesColumn) {
            console.log('🔄 Adding features column to licenses table...');
            await this.runQuery(`ALTER TABLE licenses ADD COLUMN features TEXT`);
            console.log('✅ features column added');
        }

        // Add machine_name column to activations if missing
        const hasMachineNameColumn = await this.columnExists('activations', 'machine_name');
        if (!hasMachineNameColumn) {
            console.log('🔄 Adding machine_name column to activations table...');
            await this.runQuery(`ALTER TABLE activations ADD COLUMN machine_name TEXT`);
            console.log('✅ machine_name column added');
        }
    }

    async createIndexes() {
        console.log('🔄 Creating database indexes for better performance...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON licenses(product_id)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_customer_id ON licenses(customer_id)', 
            'CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date)',
            'CREATE INDEX IF NOT EXISTS idx_activations_license_key ON activations(license_key)',
            'CREATE INDEX IF NOT EXISTS idx_activations_status ON activations(status)',
            'CREATE INDEX IF NOT EXISTS idx_audit_log_license_key ON audit_log(license_key)',
            'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)'
        ];

        for (const indexSql of indexes) {
            try {
                await this.runQuery(indexSql);
            } catch (err) {
                console.log(`⚠️  Index creation skipped: ${err.message}`);
            }
        }
        console.log('✅ Database indexes created');
    }

    async showTableInfo() {
        console.log('\n📋 Current Database Schema:');
        console.log('============================');

        const tables = ['customers', 'products', 'licenses', 'activations', 'audit_log'];
        
        for (const tableName of tables) {
            const exists = await this.tableExists(tableName);
            if (exists) {
                console.log(`\n🔹 ${tableName} table:`);
                
                const columns = await new Promise((resolve, reject) => {
                    this.db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                        if (err) reject(err);
                        else resolve(columns);
                    });
                });

                columns.forEach(col => {
                    const nullable = col.notnull ? '' : ' (nullable)';
                    const defaultVal = col.dflt_value ? ` default: ${col.dflt_value}` : '';
                    const pk = col.pk ? ' [PRIMARY KEY]' : '';
                    console.log(`  • ${col.name}: ${col.type}${nullable}${defaultVal}${pk}`);
                });

                // Show row count
                const count = await new Promise((resolve, reject) => {
                    this.db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    });
                });
                console.log(`  📊 Rows: ${count}`);
            } else {
                console.log(`\n❌ ${tableName} table: MISSING`);
            }
        }
    }

    async run() {
        try {
            await this.connect();
            
            console.log('🚀 Setting up database schema...\n');

            // Create all tables
            await this.createCustomersTable();
            await this.createProductsTable();
            await this.createLicensesTable();
            await this.createActivationsTable();
            await this.createAuditLogTable();

            // Add missing columns
            await this.addLicenseTypeColumn();
            await this.addMissingColumns();

            // Create indexes
            await this.createIndexes();

            // Show final schema
            await this.showTableInfo();

            console.log('\n🎉 Database setup completed successfully!');
            console.log('💡 Your license manager is ready to use');

        } catch (error) {
            console.error('❌ Database setup failed:', error.message);
        } finally {
            await this.close();
        }
    }
}

// Run the setup
const setup = new DatabaseSetup();
setup.run().catch(console.error);