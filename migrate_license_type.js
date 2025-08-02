// migrate_license_type.js - Add license_type column to existing database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'license.db');

function runMigration() {
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error opening database:', err.message);
            return;
        }
        console.log('📁 Connected to SQLite database');
    });

    // Check if license_type column already exists
    db.all("PRAGMA table_info(licenses)", (err, columns) => {
        if (err) {
            console.error('❌ Error checking table structure:', err.message);
            db.close();
            return;
        }

        const hasLicenseType = columns.some(col => col.name === 'license_type');
        
        if (hasLicenseType) {
            console.log('✅ license_type column already exists in the database');
            db.close();
            return;
        }

        console.log('🔄 Adding license_type column to licenses table...');
        
        // Add the license_type column with default value 'machine'
        db.run(`ALTER TABLE licenses ADD COLUMN license_type TEXT DEFAULT 'machine'`, (err) => {
            if (err) {
                console.error('❌ Error adding license_type column:', err.message);
                db.close();
                return;
            }

            console.log('✅ Successfully added license_type column');

            // Update any existing licenses that have NULL license_type to 'machine'
            db.run(`UPDATE licenses SET license_type = 'machine' WHERE license_type IS NULL`, (err) => {
                if (err) {
                    console.error('❌ Error updating existing licenses:', err.message);
                } else {
                    console.log('✅ Updated existing licenses with default license_type = "machine"');
                }

                // Show current table structure
                db.all("PRAGMA table_info(licenses)", (err, updatedColumns) => {
                    if (!err) {
                        console.log('\n📋 Updated licenses table structure:');
                        updatedColumns.forEach(col => {
                            console.log(`  ${col.name}: ${col.type}${col.dflt_value ? ` (default: ${col.dflt_value})` : ''}${col.notnull ? ' NOT NULL' : ''}`);
                        });
                    }

                    // Show sample data to verify
                    db.all("SELECT license_key, product_id, customer_id, license_type, status FROM licenses LIMIT 3", (err, rows) => {
                        if (!err && rows.length > 0) {
                            console.log('\n📊 Sample license data:');
                            rows.forEach(row => {
                                console.log(`  ${row.license_key}: ${row.license_type} (${row.product_id} → ${row.customer_id})`);
                            });
                        } else if (!err) {
                            console.log('\n📊 No existing licenses found');
                        }

                        db.close((err) => {
                            if (err) {
                                console.error('❌ Error closing database:', err.message);
                            } else {
                                console.log('\n🎉 Migration completed successfully!');
                                console.log('💡 You can now use license_type field in your admin tools');
                            }
                        });
                    });
                });
            });
        });
    });
}

// Run the migration
console.log('🚀 Starting database migration...');
console.log('📂 Database file:', DB_PATH);
runMigration();