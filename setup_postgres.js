// setup_postgres.js - PostgreSQL database setup and migration script
const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/license_db',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class PostgreSQLSetup {
    constructor() {
        this.pool = pool;
    }

    async connect() {
        try {
            await this.pool.query('SELECT NOW()');
            console.log('📁 Connected to PostgreSQL database');
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async close() {
        await this.pool.end();
        console.log('📁 Database connection closed');
    }

    async tableExists(tableName) {
        try {
            const result = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )
            `, [tableName]);
            return result.rows[0].exists;
        } catch (error) {
            throw error;
        }
    }

    async columnExists(tableName, columnName) {
        try {
            const result = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = $1 
                    AND column_name = $2
                )
            `, [tableName, columnName]);
            return result.rows[0].exists;
        } catch (error) {
            throw error;
        }
    }

    async runQuery(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return { 
                changes: result.rowCount, 
                lastID: result.rows[0]?.id || null 
            };
        } catch (error) {
            throw error;
        }
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
                email TEXT UNIQUE,
                company TEXT,
                phone TEXT,
                address TEXT,
                metadata TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
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
                description TEXT,
                version TEXT,
                features TEXT DEFAULT '[]',
                default_max_activations INTEGER DEFAULT 1,
                default_validity_days INTEGER DEFAULT 365,
                created_at TIMESTAMP DEFAULT NOW()
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
                id TEXT PRIMARY KEY,
                license_key TEXT UNIQUE NOT NULL,
                product_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                customer_email TEXT,
                license_type TEXT DEFAULT 'machine',
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'revoked')),
                issue_date TIMESTAMP DEFAULT NOW(),
                expiry_date TIMESTAMP NOT NULL,
                max_activations INTEGER DEFAULT 1,
                current_activations INTEGER DEFAULT 0,
                features TEXT DEFAULT '[]',
                metadata TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (customer_id) REFERENCES customers(id)
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
                id TEXT PRIMARY KEY,
                license_id TEXT NOT NULL,
                machine_fingerprint TEXT NOT NULL,
                activation_date TIMESTAMP DEFAULT NOW(),
                last_heartbeat TIMESTAMP DEFAULT NOW(),
                client_info TEXT DEFAULT '{}',
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
                UNIQUE(license_id, machine_fingerprint)
            )
        `);
        console.log('✅ activations table created');
    }

    async createAuditLogTable() {
        const exists = await this.tableExists('license_audit_log');
        if (exists) {
            console.log('✅ license_audit_log table already exists');
            return;
        }

        console.log('🔄 Creating license_audit_log table...');
        await this.runQuery(`
            CREATE TABLE license_audit_log (
                id TEXT PRIMARY KEY,
                license_id TEXT,
                action TEXT NOT NULL,
                machine_fingerprint TEXT,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT DEFAULT '{}',
                timestamp TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (license_id) REFERENCES licenses(id)
            )
        `);
        console.log('✅ license_audit_log table created');
    }

    async createIndexes() {
        console.log('🔄 Creating database indexes for better performance...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses(license_key)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_product_id ON licenses(product_id)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_customer_id ON licenses(customer_id)', 
            'CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)',
            'CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date)',
            'CREATE INDEX IF NOT EXISTS idx_activations_license_id ON activations(license_id)',
            'CREATE INDEX IF NOT EXISTS idx_activations_machine_fingerprint ON activations(machine_fingerprint)',
            'CREATE INDEX IF NOT EXISTS idx_audit_log_license_id ON license_audit_log(license_id)',
            'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON license_audit_log(timestamp)'
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

    async createTriggers() {
        console.log('🔄 Creating triggers for email synchronization...');
        
        // PostgreSQL equivalent of SQLite triggers
        await this.runQuery(`
            CREATE OR REPLACE FUNCTION sync_customer_email()
            RETURNS TRIGGER AS $$
            BEGIN
                IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                    UPDATE licenses 
                    SET customer_email = (
                        SELECT email FROM customers WHERE id = NEW.customer_id
                    )
                    WHERE customer_id = NEW.customer_id
                    AND NEW.customer_id IS NOT NULL;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await this.runQuery(`
            DROP TRIGGER IF EXISTS sync_customer_email_on_insert ON licenses;
            CREATE TRIGGER sync_customer_email_on_insert
                AFTER INSERT ON licenses
                FOR EACH ROW
                EXECUTE FUNCTION sync_customer_email();
        `);

        await this.runQuery(`
            DROP TRIGGER IF EXISTS sync_customer_email_on_update ON licenses;
            CREATE TRIGGER sync_customer_email_on_update
                AFTER UPDATE OF customer_id ON licenses
                FOR EACH ROW
                EXECUTE FUNCTION sync_customer_email();
        `);

        await this.runQuery(`
            DROP TRIGGER IF EXISTS sync_customer_email_on_customer_update ON customers;
            CREATE TRIGGER sync_customer_email_on_customer_update
                AFTER UPDATE OF email ON customers
                FOR EACH ROW
                EXECUTE FUNCTION sync_customer_email();
        `);

        console.log('✅ Email synchronization triggers created');
    }

    async showTableInfo() {
        console.log('\n📋 Current Database Schema:');
        console.log('============================');

        const tables = ['customers', 'products', 'licenses', 'activations', 'license_audit_log'];
        
        for (const tableName of tables) {
            const exists = await this.tableExists(tableName);
            if (exists) {
                console.log(`\n🔹 ${tableName} table:`);
                
                const columns = await this.pool.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position
                `, [tableName]);

                columns.rows.forEach(col => {
                    const nullable = col.is_nullable === 'YES' ? ' (nullable)' : '';
                    const defaultVal = col.column_default ? ` default: ${col.column_default}` : '';
                    console.log(`  • ${col.column_name}: ${col.data_type}${nullable}${defaultVal}`);
                });

                // Show row count
                const countResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = countResult.rows[0].count;
                console.log(`  📊 Rows: ${count}`);
            } else {
                console.log(`\n❌ ${tableName} table: MISSING`);
            }
        }
    }

    async run() {
        try {
            await this.connect();
            
            console.log('🚀 Setting up PostgreSQL database schema...\n');

            // Create all tables
            await this.createCustomersTable();
            await this.createProductsTable();
            await this.createLicensesTable();
            await this.createActivationsTable();
            await this.createAuditLogTable();

            // Create indexes
            await this.createIndexes();

            // Create triggers
            await this.createTriggers();

            // Show final schema
            await this.showTableInfo();

            console.log('\n🎉 PostgreSQL database setup completed successfully!');
            console.log('💡 Your license manager is ready to use with PostgreSQL');

        } catch (error) {
            console.error('❌ Database setup failed:', error.message);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Export for programmatic use
module.exports = { PostgreSQLSetup };

// Run the setup if called directly
if (require.main === module) {
    const setup = new PostgreSQLSetup();
    setup.run().catch(console.error);
}