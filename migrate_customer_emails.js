// migrate_customer_emails.js - Sync customer emails to licenses table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'license.db');

class EmailMigration {
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

    async getAllRows(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async addCustomerEmailColumn() {
        const hasColumn = await this.columnExists('licenses', 'customer_email');
        
        if (!hasColumn) {
            console.log('🔄 Adding customer_email column to licenses table...');
            await this.runQuery('ALTER TABLE licenses ADD COLUMN customer_email TEXT');
            console.log('✅ customer_email column added');
        } else {
            console.log('✅ customer_email column already exists');
        }
    }

    async syncCustomerEmails() {
        console.log('🔄 Syncing customer emails to licenses...');

        // Get all licenses with their customer_id
        const licenses = await this.getAllRows(`
            SELECT license_key, customer_id, customer_email 
            FROM licenses 
            WHERE customer_id IS NOT NULL
        `);

        console.log(`📊 Found ${licenses.length} licenses to process`);

        let updated = 0;
        let errors = 0;
        let skipped = 0;

        for (const license of licenses) {
            try {
                // Get customer email from customers table
                const customer = await this.getAllRows(`
                    SELECT email FROM customers WHERE id = ?
                `, [license.customer_id]);

                if (customer.length > 0) {
                    const customerEmail = customer[0].email;
                    
                    // Only update if customer_email is different or null
                    if (license.customer_email !== customerEmail) {
                        await this.runQuery(`
                            UPDATE licenses 
                            SET customer_email = ? 
                            WHERE license_key = ?
                        `, [customerEmail, license.license_key]);
                        
                        console.log(`  ✅ ${license.license_key}: ${license.customer_id} → ${customerEmail}`);
                        updated++;
                    } else {
                        skipped++;
                    }
                } else {
                    console.log(`  ⚠️  ${license.license_key}: Customer '${license.customer_id}' not found in customers table`);
                    errors++;
                }
            } catch (error) {
                console.error(`  ❌ Error processing ${license.license_key}:`, error.message);
                errors++;
            }
        }

        console.log(`\n📈 Migration Summary:`);
        console.log(`  ✅ Updated: ${updated} licenses`);
        console.log(`  ⏭️  Skipped: ${skipped} licenses (already correct)`);
        console.log(`  ❌ Errors: ${errors} licenses`);
    }

    async createTriggers() {
        console.log('🔄 Creating triggers to keep customer emails in sync...');

        // Trigger for when a license is inserted
        try {
            await this.runQuery(`
                CREATE TRIGGER IF NOT EXISTS sync_customer_email_on_insert
                AFTER INSERT ON licenses
                FOR EACH ROW
                BEGIN
                    UPDATE licenses 
                    SET customer_email = (
                        SELECT email FROM customers WHERE id = NEW.customer_id
                    )
                    WHERE license_key = NEW.license_key
                    AND NEW.customer_id IS NOT NULL;
                END
            `);
            console.log('✅ Insert trigger created');
        } catch (error) {
            console.log('⚠️  Insert trigger already exists or failed:', error.message);
        }

        // Trigger for when a customer email is updated
        try {
            await this.runQuery(`
                CREATE TRIGGER IF NOT EXISTS sync_customer_email_on_customer_update
                AFTER UPDATE OF email ON customers
                FOR EACH ROW
                BEGIN
                    UPDATE licenses 
                    SET customer_email = NEW.email 
                    WHERE customer_id = NEW.id;
                END
            `);
            console.log('✅ Customer update trigger created');
        } catch (error) {
            console.log('⚠️  Customer update trigger already exists or failed:', error.message);
        }

        // Trigger for when license customer_id is updated
        try {
            await this.runQuery(`
                CREATE TRIGGER IF NOT EXISTS sync_customer_email_on_license_update
                AFTER UPDATE OF customer_id ON licenses
                FOR EACH ROW
                BEGIN
                    UPDATE licenses 
                    SET customer_email = (
                        SELECT email FROM customers WHERE id = NEW.customer_id
                    )
                    WHERE license_key = NEW.license_key
                    AND NEW.customer_id IS NOT NULL;
                END
            `);
            console.log('✅ License update trigger created');
        } catch (error) {
            console.log('⚠️  License update trigger already exists or failed:', error.message);
        }
    }

    async showSampleData() {
        console.log('\n📊 Sample data after migration:');
        
        const sampleLicenses = await this.getAllRows(`
            SELECT l.license_key, l.customer_id, l.customer_email, c.email as actual_customer_email
            FROM licenses l
            LEFT JOIN customers c ON l.customer_id = c.id
            LIMIT 5
        `);

        if (sampleLicenses.length > 0) {
            console.log('\nLicense Key'.padEnd(20) + 'Customer ID'.padEnd(15) + 'License Email'.padEnd(25) + 'Customer Email');
            console.log('-'.repeat(80));
            
            sampleLicenses.forEach(row => {
                const licenseKey = (row.license_key || '').substring(0, 18).padEnd(20);
                const customerId = (row.customer_id || '').padEnd(15);
                const licenseEmail = (row.customer_email || 'NULL').padEnd(25);
                const customerEmail = row.actual_customer_email || 'NULL';
                const status = row.customer_email === row.actual_customer_email ? '✅' : '❌';
                
                console.log(`${licenseKey}${customerId}${licenseEmail}${customerEmail} ${status}`);
            });
        } else {
            console.log('No licenses found');
        }
    }

    async validateData() {
        console.log('\n🔍 Validating data consistency...');
        
        // Check for mismatched emails
        const mismatches = await this.getAllRows(`
            SELECT l.license_key, l.customer_id, l.customer_email, c.email as actual_email
            FROM licenses l
            JOIN customers c ON l.customer_id = c.id
            WHERE l.customer_email != c.email OR l.customer_email IS NULL
        `);

        if (mismatches.length > 0) {
            console.log(`❌ Found ${mismatches.length} licenses with incorrect customer emails:`);
            mismatches.forEach(row => {
                console.log(`  ${row.license_key}: has '${row.customer_email}' should be '${row.actual_email}'`);
            });
        } else {
            console.log('✅ All license customer emails are consistent');
        }

        // Check for orphaned licenses (customer_id doesn't exist)
        const orphans = await this.getAllRows(`
            SELECT l.license_key, l.customer_id
            FROM licenses l
            LEFT JOIN customers c ON l.customer_id = c.id
            WHERE c.id IS NULL AND l.customer_id IS NOT NULL
        `);

        if (orphans.length > 0) {
            console.log(`⚠️  Found ${orphans.length} licenses with non-existent customers:`);
            orphans.forEach(row => {
                console.log(`  ${row.license_key}: references customer '${row.customer_id}' (not found)`);
            });
        } else {
            console.log('✅ All licenses reference existing customers');
        }
    }

    async run() {
        try {
            await this.connect();
            
            console.log('🚀 Starting customer email migration...\n');

            // Add customer_email column if it doesn't exist
            await this.addCustomerEmailColumn();

            // Sync all existing licenses
            await this.syncCustomerEmails();

            // Create triggers for automatic syncing
            await this.createTriggers();

            // Show sample data
            await this.showSampleData();

            // Validate data consistency
            await this.validateData();

            console.log('\n🎉 Customer email migration completed successfully!');
            console.log('💡 Customer emails will now automatically stay in sync');

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
        } finally {
            await this.close();
        }
    }
}

// Run the migration
const migration = new EmailMigration();
migration.run().catch(console.error);