// direct_admin_tools.js - Direct database access admin tools
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const path = require('path');

const DB_PATH = path.join(__dirname, 'license.db');

// Create readline interface for interactive input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

class DirectLicenseAdmin {
    constructor() {
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                } else {
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
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    async getAllRows(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes, lastID: this.lastID });
                }
            });
        });
    }

    // ============================================
    // CUSTOMER MANAGEMENT
    // ============================================

    async listCustomers() {
        try {
            const customers = await this.getAllRows(`
                SELECT id, name, email, company, created_at
                FROM customers
                ORDER BY created_at DESC
            `);
            return customers;
        } catch (error) {
            return { error: error.message };
        }
    }

    async createCustomer(customerData) {
        try {
            await this.runQuery(`
                INSERT INTO customers (id, name, email, company, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `, [customerData.id, customerData.name, customerData.email, customerData.company || null]);
            
            return { success: true, id: customerData.id };
        } catch (error) {
            return { error: error.message };
        }
    }

    async deleteCustomer(customerId) {
        try {
            const result = await this.runQuery('DELETE FROM customers WHERE id = ?', [customerId]);
            if (result.changes === 0) {
                return { error: 'Customer not found' };
            }
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    // ============================================
    // PRODUCT MANAGEMENT
    // ============================================

    async listProducts() {
        try {
            const products = await this.getAllRows(`
                SELECT id, name, version, description, default_max_activations, features, created_at
                FROM products
                ORDER BY created_at DESC
            `);
            return products.map(product => ({
                ...product,
                features: product.features ? JSON.parse(product.features) : []
            }));
        } catch (error) {
            return { error: error.message };
        }
    }

    async createProduct(productData) {
        try {
            await this.runQuery(`
                INSERT INTO products (id, name, version, description, default_max_activations, features, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                productData.id,
                productData.name,
                productData.version || null,
                productData.description || null,
                productData.default_max_activations || 1,
                productData.features ? JSON.stringify(productData.features) : null
            ]);
            
            return { success: true, id: productData.id };
        } catch (error) {
            return { error: error.message };
        }
    }

    async deleteProduct(productId) {
        try {
            const result = await this.runQuery('DELETE FROM products WHERE id = ?', [productId]);
            if (result.changes === 0) {
                return { error: 'Product not found' };
            }
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    // ============================================
    // LICENSE MANAGEMENT
    // ============================================

    async listLicenses(filters = {}) {
        try {
            let query = `
                SELECT 
                    l.license_key,
                    l.product_id,
                    l.customer_id,
                    l.customer_email,
                    l.license_type,
                    l.status,
                    l.created_at,
                    l.expiry_date,
                    l.max_activations,
                    l.current_activations,
                    l.features,
                    c.name as customer_name,
                    c.email as customer_actual_email,
                    p.name as product_name
                FROM licenses l
                LEFT JOIN customers c ON l.customer_id = c.id
                LEFT JOIN products p ON l.product_id = p.id
                WHERE 1=1
            `;
            const params = [];

            if (filters.customer_id) {
                query += ' AND l.customer_id = ?';
                params.push(filters.customer_id);
            }

            if (filters.product_id) {
                query += ' AND l.product_id = ?';
                params.push(filters.product_id);
            }

            if (filters.status) {
                query += ' AND l.status = ?';
                params.push(filters.status);
            }

            if (filters.license_type) {
                query += ' AND l.license_type = ?';
                params.push(filters.license_type);
            }

            query += ' ORDER BY l.created_at DESC';

            const licenses = await this.getAllRows(query, params);
            
            return licenses.map(license => ({
                ...license,
                features: license.features ? JSON.parse(license.features) : [],
                customer_email: license.customer_actual_email || license.customer_email
            }));
        } catch (error) {
            return { error: error.message };
        }
    }

    async createLicense(licenseData) {
        try {
            // Generate license key
            const license_key = this.generateLicenseKey();

            // Get customer email
            const customer = await this.getAllRows('SELECT email FROM customers WHERE id = ?', [licenseData.customer_id]);
            if (customer.length === 0) {
                return { error: `Customer '${licenseData.customer_id}' not found` };
            }
            const customer_email = customer[0].email;

            await this.runQuery(`
                INSERT INTO licenses (
                    license_key, product_id, customer_id, customer_email, license_type,
                    expiry_date, max_activations, current_activations, features, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', datetime('now'))
            `, [
                license_key,
                licenseData.product_id,
                licenseData.customer_id,
                customer_email,
                licenseData.license_type || 'machine',
                licenseData.expiry_date,
                licenseData.max_activations || 1,
                licenseData.features ? JSON.stringify(licenseData.features) : null
            ]);

            return {
                license_key,
                product_id: licenseData.product_id,
                customer_id: licenseData.customer_id,
                customer_email,
                license_type: licenseData.license_type || 'machine',
                expiry_date: licenseData.expiry_date,
                max_activations: licenseData.max_activations || 1,
                features: licenseData.features || [],
                status: 'active'
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async deleteLicense(licenseKey) {
        try {
            const result = await this.runQuery('DELETE FROM licenses WHERE license_key = ?', [licenseKey]);
            if (result.changes === 0) {
                return { error: 'License not found' };
            }
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    async updateLicense(licenseKey, updates) {
        try {
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);
            values.push(licenseKey);

            const result = await this.runQuery(
                `UPDATE licenses SET ${setClause} WHERE license_key = ?`,
                values
            );

            if (result.changes === 0) {
                return { error: 'License not found' };
            }
            return { success: true };
        } catch (error) {
            return { error: error.message };
        }
    }

    // ============================================
    // REPORTING
    // ============================================

    async generateReport() {
        try {
            const [totalLicenses] = await this.getAllRows('SELECT COUNT(*) as count FROM licenses');
            const [activeLicenses] = await this.getAllRows('SELECT COUNT(*) as count FROM licenses WHERE status = "active"');
            const [expiredLicenses] = await this.getAllRows('SELECT COUNT(*) as count FROM licenses WHERE expiry_date < datetime("now") AND status = "active"');
            const [totalActivations] = await this.getAllRows('SELECT SUM(current_activations) as total FROM licenses');
            const [uniqueCustomers] = await this.getAllRows('SELECT COUNT(DISTINCT customer_id) as count FROM licenses');
            const [totalProducts] = await this.getAllRows('SELECT COUNT(*) as count FROM products');

            return {
                total_licenses: totalLicenses.count,
                active_licenses: activeLicenses.count,
                expired_licenses: expiredLicenses.count,
                total_activations: totalActivations.total || 0,
                unique_customers: uniqueCustomers.count,
                total_products: totalProducts.count
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getAuditLog(licenseKey = null, limit = 100) {
        try {
            let query = 'SELECT * FROM audit_log';
            const params = [];

            if (licenseKey) {
                query += ' WHERE license_key = ?';
                params.push(licenseKey);
            }

            query += ' ORDER BY timestamp DESC LIMIT ?';
            params.push(limit);

            const logs = await this.getAllRows(query, params);
            return logs;
        } catch (error) {
            return { error: error.message };
        }
    }

    // ============================================
    // LICENSE KEY GENERATION
    // ============================================

    generateLicenseKey(prefix = '', format = 'standard') {
        const formats = {
            standard: () => {
                const segments = [];
                for (let i = 0; i < 4; i++) {
                    const segment = Math.random().toString(36).substring(2, 6).toUpperCase();
                    segments.push(segment.padEnd(4, '0'));
                }
                return segments.join('-');
            },
            
            compact: () => {
                return Math.random().toString(36).substring(2, 14).toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(12, '0');
            },
            
            readable: () => {
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const numbers = '0123456789';
                
                const randomLetters = () => Array.from({length: 4}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
                const randomNumbers = () => Array.from({length: 4}, () => numbers[Math.floor(Math.random() * numbers.length)]).join('');
                
                return `${randomLetters()}-${randomNumbers()}-${randomLetters()}-${randomNumbers()}`;
            },
            
            uuid: () => {
                const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
                const segment = (length) => Array.from({length}, hex).join('');
                
                return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}`;
            }
        };
        
        let key = formats[format] ? formats[format]() : formats.standard();
        
        if (prefix) {
            key = prefix.toUpperCase() + '-' + key;
        }
        
        return key;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    formatTable(data, columns) {
        if (!data || data.length === 0) {
            console.log('No data found.');
            return;
        }

        const widths = {};
        columns.forEach(col => {
            widths[col] = Math.max(
                col.length,
                ...data.map(row => String(row[col] || '').length)
            );
        });

        const header = columns.map(col => col.padEnd(widths[col])).join(' | ');
        console.log(header);
        console.log(columns.map(col => '-'.repeat(widths[col])).join('-+-'));

        data.forEach(row => {
            const line = columns.map(col => String(row[col] || '').padEnd(widths[col])).join(' | ');
            console.log(line);
        });
    }
}

// ============================================
// INTERACTIVE CLI
// ============================================

class DirectInteractiveCLI {
    constructor() {
        this.admin = new DirectLicenseAdmin();
    }

    async start() {
        try {
            await this.admin.connect();
            console.log('🔧 License Database Management Tool (Direct DB Access)');
            console.log('=====================================================\n');

            while (true) {
                console.log('Available commands:');
                console.log('1. List customers');
                console.log('2. Create customer');
                console.log('3. List products');
                console.log('4. Create product');
                console.log('5. List licenses');
                console.log('6. Create license');
                console.log('7. Generate license key only');
                console.log('8. Delete product');
                console.log('9. Delete customer');
                console.log('10. Delete license');
                console.log('11. Revoke license');
                console.log('12. Generate report');
                console.log('13. View audit log');
                console.log('14. Check database status');
                console.log('0. Exit\n');

                const choice = await askQuestion('Enter your choice (0-14): ');

                try {
                    switch (choice) {
                        case '1':
                            await this.listCustomers();
                            break;
                        case '2':
                            await this.createCustomer();
                            break;
                        case '3':
                            await this.listProducts();
                            break;
                        case '4':
                            await this.createProduct();
                            break;
                        case '5':
                            await this.listLicenses();
                            break;
                        case '6':
                            await this.createLicense();
                            break;
                        case '7':
                            await this.generateLicenseKey();
                            break;
                        case '8':
                            await this.deleteProduct();
                            break;
                        case '9':
                            await this.deleteCustomer();
                            break;
                        case '10':
                            await this.deleteLicense();
                            break;
                        case '11':
                            await this.revokeLicense();
                            break;
                        case '12':
                            await this.generateReport();
                            break;
                        case '13':
                            await this.viewAuditLog();
                            break;
                        case '14':
                            await this.checkDatabaseStatus();
                            break;
                        case '0':
                            console.log('Goodbye!');
                            await this.admin.close();
                            rl.close();
                            return;
                        default:
                            console.log('Invalid choice. Please try again.\n');
                    }
                } catch (error) {
                    console.error('Error:', error.message);
                }

                console.log('\n' + '='.repeat(50) + '\n');
            }
        } catch (error) {
            console.error('Failed to connect to database:', error.message);
            console.error('Make sure license_manager.db exists in the current directory');
            rl.close();
        }
    }

    async listCustomers() {
        console.log('\n📋 Customer List:');
        const result = await this.admin.listCustomers();
        if (result.error) {
            console.error('Error:', result.error);
            return;
        }

        this.admin.formatTable(result, ['id', 'name', 'email', 'company', 'created_at']);
    }

    async createCustomer() {
        console.log('\n➕ Create New Customer:');
        
        const id = await askQuestion('Customer ID: ');
        const name = await askQuestion('Name: ');
        const email = await askQuestion('Email: ');
        const company = await askQuestion('Company (optional): ');

        const customerData = { id, name, email };
        if (company) customerData.company = company;

        const result = await this.admin.createCustomer(customerData);
        if (result.error) {
            console.error('Error:', result.error);
        } else {
            console.log('✅ Customer created successfully!');
        }
    }

    async listProducts() {
        console.log('\n📦 Product List:');
        const result = await this.admin.listProducts();
        if (result.error) {
            console.error('Error:', result.error);
            return;
        }

        this.admin.formatTable(result, ['id', 'name', 'version', 'default_max_activations']);
    }

    async createProduct() {
        console.log('\n➕ Create New Product:');
        
        const id = await askQuestion('Product ID: ');
        const name = await askQuestion('Product Name: ');
        const version = await askQuestion('Version (optional): ');
        const description = await askQuestion('Description (optional): ');
        const maxActivations = await askQuestion('Default Max Activations (1): ');
        const featuresInput = await askQuestion('Features (comma-separated, optional): ');

        const productData = {
            id,
            name,
            default_max_activations: parseInt(maxActivations) || 1
        };

        if (version) productData.version = version;
        if (description) productData.description = description;
        if (featuresInput) {
            productData.features = featuresInput.split(',').map(f => f.trim());
        }

        const result = await this.admin.createProduct(productData);
        if (result.error) {
            console.error('Error:', result.error);
        } else {
            console.log('✅ Product created successfully!');
        }
    }

    async listLicenses() {
        console.log('\n🎫 License List:');
        const result = await this.admin.listLicenses();
        if (result.error) {
            console.error('Error:', result.error);
            return;
        }

        this.admin.formatTable(result, [
            'license_key', 'product_id', 'customer_id', 'customer_email', 'license_type', 'status', 
            'expiry_date', 'current_activations', 'max_activations'
        ]);
    }

    async createLicense() {
        console.log('\n➕ Create New License:');
        
        const productId = await askQuestion('Product ID: ');
        const customerId = await askQuestion('Customer ID: ');
        
        // Check if product exists
        const products = await this.admin.listProducts();
        const productExists = !products.error && products.some(p => p.id === productId);
        
        if (!productExists) {
            console.log(`⚠️  Product '${productId}' does not exist.`);
            const createProduct = await askQuestion('Create this product automatically? (y/n): ');
            
            if (createProduct.toLowerCase() === 'y') {
                const productName = await askQuestion('Product Name: ');
                const productDescription = await askQuestion('Description (optional): ');
                const defaultMaxActivations = await askQuestion('Default Max Activations (1): ');
                
                const productData = {
                    id: productId,
                    name: productName,
                    default_max_activations: parseInt(defaultMaxActivations) || 1
                };
                
                if (productDescription) productData.description = productDescription;
                
                const productResult = await this.admin.createProduct(productData);
                if (productResult.error) {
                    console.error('❌ Failed to create product:', productResult.error);
                    return;
                } else {
                    console.log('✅ Product created successfully!');
                }
            } else {
                console.log('❌ Cannot create license without valid product. Cancelled.');
                return;
            }
        }
        
        // Check if customer exists
        const customers = await this.admin.listCustomers();
        const customerExists = !customers.error && customers.some(c => c.id === customerId);
        
        if (!customerExists) {
            console.log(`⚠️  Customer '${customerId}' does not exist.`);
            const createCustomer = await askQuestion('Create this customer automatically? (y/n): ');
            
            if (createCustomer.toLowerCase() === 'y') {
                const customerName = await askQuestion('Customer Name: ');
                const customerEmail = await askQuestion('Customer Email: ');
                const customerCompany = await askQuestion('Company (optional): ');
                
                const customerData = {
                    id: customerId,
                    name: customerName,
                    email: customerEmail
                };
                
                if (customerCompany) customerData.company = customerCompany;
                
                const customerResult = await this.admin.createCustomer(customerData);
                if (customerResult.error) {
                    console.error('❌ Failed to create customer:', customerResult.error);
                    return;
                } else {
                    console.log('✅ Customer created successfully!');
                }
            } else {
                console.log('❌ Cannot create license without valid customer. Cancelled.');
                return;
            }
        }
        
        const daysValid = await askQuestion('Valid for how many days? (0 for perpetual): ');
        const licenseType = await askQuestion('License type (machine/network) [machine]: ');
        
        let maxValue;
        if (licenseType.toLowerCase() === 'network') {
            maxValue = await askQuestion('Max concurrent users (10): ');
        } else {
            maxValue = await askQuestion('Max activations (1): ');
        }
        
        const featuresInput = await askQuestion('Features (comma-separated, optional): ');

        const expiryDate = new Date();
        const days = parseInt(daysValid);
        if (days === 0) {
            expiryDate.setFullYear(2100);
        } else {
            expiryDate.setDate(expiryDate.getDate() + (days || 365));
        }

        let features = [];
        if (featuresInput) {
            features = featuresInput.split(',').map(f => f.trim());
        }

        const licenseData = {
            product_id: productId,
            customer_id: customerId,
            license_type: licenseType.toLowerCase() || 'machine',
            expiry_date: expiryDate.toISOString(),
            max_activations: parseInt(maxValue) || (licenseType.toLowerCase() === 'network' ? 10 : 1),
            features: features
        };

        const result = await this.admin.createLicense(licenseData);
        if (result.error) {
            console.error('Error:', result.error);
        } else {
            console.log('✅ License created successfully!');
            console.log('🔑 License Key:', result.license_key);
            console.log('📧 Customer Email:', result.customer_email);
            
            if (days === 0) {
                console.log('⏰ License Type: Perpetual (never expires)');
            }
            
            if (licenseData.license_type === 'network') {
                console.log('🌐 License Type: Network/Floating License');
                console.log(`👥 Concurrent Users: Up to ${licenseData.max_activations} simultaneous users`);
            } else {
                console.log('💻 License Type: Machine-Based License');
                console.log(`🔒 Machine Limit: Up to ${licenseData.max_activations} machines`);
            }
            
            if (features.length > 0) {
                console.log('🎯 Features:', features.join(', '));
            }
        }
    }

    async generateLicenseKey() {
        console.log('\n🔑 License Key Generator:');
        
        const count = await askQuestion('How many keys to generate? (1): ');
        const format = await askQuestion('Format (standard/compact/readable/uuid) [standard]: ');
        const prefix = await askQuestion('Prefix (optional): ');
        
        const keyCount = parseInt(count) || 1;
        const keyFormat = format || 'standard';
        
        console.log(`\n📋 Generated ${keyCount} license key(s):`);
        console.log('='.repeat(50));
        
        for (let i = 0; i < keyCount; i++) {
            const key = this.admin.generateLicenseKey(prefix, keyFormat);
            console.log(`${String(i + 1).padStart(3, ' ')}. ${key}`);
        }
        
        console.log('='.repeat(50));
        console.log('💡 These are just key formats - use "Create license" to actually create licenses in the database.');
    }

    async deleteProduct() {
        console.log('\n🗑️ Delete Product:');
        
        const products = await this.admin.listProducts();
        if (!products.error && products.length > 0) {
            console.log('\nExisting Products:');
            this.admin.formatTable(products, ['id', 'name', 'version']);
        }
        
        const productId = await askQuestion('\nProduct ID to delete: ');
        
        const licenses = await this.admin.listLicenses({ product_id: productId });
        if (!licenses.error && licenses.length > 0) {
            console.log(`⚠️  Warning: This product has ${licenses.length} active license(s)!`);
            
            const forceDelete = await askQuestion('Continue anyway? (yes/no): ');
            if (forceDelete.toLowerCase() !== 'yes') {
                console.log('Cancelled.');
                return;
            }
        }
        
        const confirm = await askQuestion(`Are you sure you want to delete product '${productId}'? (yes/no): `);
        if (confirm.toLowerCase() !== 'yes') {
            console.log('Cancelled.');
            return;
        }

        const result = await this.admin.deleteProduct(productId);
        if (result.error) {
            console.error('❌ Error:', result.error);
        } else {
            console.log('✅ Product deleted successfully!');
        }
    }

    async deleteCustomer() {
        console.log('\n🗑️ Delete Customer:');
        
        const customers = await this.admin.listCustomers();
        if (!customers.error && customers.length > 0) {
            console.log('\nExisting Customers:');
            this.admin.formatTable(customers, ['id', 'name', 'email', 'company']);
        }
        
        const customerId = await askQuestion('\nCustomer ID to delete: ');
        
        const licenses = await this.admin.listLicenses({ customer_id: customerId });
        if (!licenses.error && licenses.length > 0) {
            console.log(`⚠️  Warning: This customer has ${licenses.length} active license(s)!`);
            
            const forceDelete = await askQuestion('Continue anyway? (yes/no): ');
            if (forceDelete.toLowerCase() !== 'yes') {
                console.log('Cancelled.');
                return;
            }
        }
        
        const confirm = await askQuestion(`Are you sure you want to delete customer '${customerId}'? (yes/no): `);
        if (confirm.toLowerCase() !== 'yes') {
            console.log('Cancelled.');
            return;
        }

        const result = await this.admin.deleteCustomer(customerId);
        if (result.error) {
            console.error('❌ Error:', result.error);
        } else {
            console.log('✅ Customer deleted successfully!');
        }
    }

    async deleteLicense() {
        console.log('\n🗑️ Delete License:');
        
        const licenses = await this.admin.listLicenses();
        if (!licenses.error && licenses.length > 0) {
            console.log('\nRecent Licenses:');
            this.admin.formatTable(licenses.slice(0, 10), ['license_key', 'product_id', 'customer_id', 'license_type', 'status']);
            if (licenses.length > 10) {
                console.log(`... and ${licenses.length - 10} more`);
            }
        }
        
        const licenseKey = await askQuestion('\nLicense Key to delete: ');
        
        console.log('\n⚠️  WARNING: This will permanently delete the license and all its activations!');
        console.log('This action cannot be undone.');
        
        const confirm = await askQuestion(`Type 'DELETE' to confirm deletion of ${licenseKey}: `);
        if (confirm !== 'DELETE') {
            console.log('Cancelled.');
            return;
        }

        const result = await this.admin.deleteLicense(licenseKey);
        if (result.error) {
            console.error('❌ Error:', result.error);
        } else {
            console.log('✅ License deleted successfully!');
        }
    }

    async revokeLicense() {
        console.log('\n🚫 Revoke License:');
        
        const licenseKey = await askQuestion('License Key to revoke: ');
        const confirm = await askQuestion(`Are you sure you want to revoke ${licenseKey}? (yes/no): `);
        
        if (confirm.toLowerCase() !== 'yes') {
            console.log('Cancelled.');
            return;
        }

        const result = await this.admin.updateLicense(licenseKey, { status: 'revoked' });
        if (result.error) {
            console.error('Error:', result.error);
        } else {
            console.log('✅ License revoked successfully!');
        }
    }

    async generateReport() {
        console.log('\n📊 Generate Report:');
        const result = await this.admin.generateReport();
        if (result.error) {
            console.error('Error:', result.error);
            return;
        }

        console.log('License Summary Report:');
        console.log('======================');
        console.log(`Total Licenses: ${result.total_licenses}`);
        console.log(`Active Licenses: ${result.active_licenses}`);
        console.log(`Expired Licenses: ${result.expired_licenses}`);
        console.log(`Total Activations: ${result.total_activations}`);
        console.log(`Unique Customers: ${result.unique_customers}`);
        console.log(`Products: ${result.total_products}`);
    }

    async viewAuditLog() {
        console.log('\n📜 Recent Audit Log:');
        const result = await this.admin.getAuditLog(null, 20);
        if (result.error) {
            console.error('Error:', result.error);
            return;
        }

        if (result.length === 0) {
            console.log('No audit log entries found.');
            return;
        }

        this.admin.formatTable(result, ['timestamp', 'action', 'license_key', 'machine_fingerprint']);
    }

    async checkDatabaseStatus() {
        console.log('\n🔍 Database Status:');
        
        try {
            const customers = await this.admin.listCustomers();
            const products = await this.admin.listProducts();
            const licenses = await this.admin.listLicenses();
            const auditLog = await this.admin.getAuditLog(null, 1);

            console.log('📊 Table Status:');
            console.log(`  👥 Customers: ${customers.error ? 'ERROR' : customers.length + ' records'}`);
            console.log(`  📦 Products: ${products.error ? 'ERROR' : products.length + ' records'}`);
            console.log(`  🎫 Licenses: ${licenses.error ? 'ERROR' : licenses.length + ' records'}`);
            console.log(`  📜 Audit Log: ${auditLog.error ? 'ERROR' : 'Available'}`);

            if (!licenses.error && licenses.length > 0) {
                const activeCount = licenses.filter(l => l.status === 'active').length;
                const expiredCount = licenses.filter(l => l.expiry_date && new Date(l.expiry_date) < new Date()).length;
                const machineCount = licenses.filter(l => l.license_type === 'machine').length;
                const networkCount = licenses.filter(l => l.license_type === 'network').length;

                console.log('\n🎫 License Breakdown:');
                console.log(`  ✅ Active: ${activeCount}`);
                console.log(`  ⏰ Expired: ${expiredCount}`);
                console.log(`  💻 Machine Licenses: ${machineCount}`);
                console.log(`  🌐 Network Licenses: ${networkCount}`);
            }

            // Check for data consistency
            if (!licenses.error && !customers.error) {
                const orphanedLicenses = licenses.filter(license => {
                    return !customers.find(customer => customer.id === license.customer_id);
                });

                if (orphanedLicenses.length > 0) {
                    console.log(`\n⚠️  Found ${orphanedLicenses.length} licenses with missing customers`);
                } else {
                    console.log('\n✅ All licenses have valid customer references');
                }
            }

        } catch (error) {
            console.error('Error checking database status:', error.message);
        }
    }
}

// ============================================
// COMMAND LINE INTERFACE
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        const cli = new DirectInteractiveCLI();
        await cli.start();
        return;
    }

    const admin = new DirectLicenseAdmin();

    try {
        await admin.connect();

        switch (command) {
            case 'customers':
                const customers = await admin.listCustomers();
                if (customers.error) {
                    console.error('Error:', customers.error);
                } else {
                    admin.formatTable(customers, ['id', 'name', 'email', 'company']);
                }
                break;

            case 'products':
                const products = await admin.listProducts();
                if (products.error) {
                    console.error('Error:', products.error);
                } else {
                    admin.formatTable(products, ['id', 'name', 'version', 'default_max_activations']);
                }
                break;

            case 'licenses':
                const licenses = await admin.listLicenses();
                if (licenses.error) {
                    console.error('Error:', licenses.error);
                } else {
                    admin.formatTable(licenses, ['license_key', 'product_id', 'customer_id', 'customer_email', 'license_type', 'status', 'expiry_date']);
                }
                break;

            case 'create-license':
                if (args.length < 3) {
                    console.log('Usage: node direct_admin_tools.js create-license <product_id> <customer_id> [days] [max_activations] [license_type]');
                    console.log('Example: node direct_admin_tools.js create-license TEMPAS_PRO CUST001 365 3 machine');
                    break;
                }
                
                const expiryDate = new Date();
                const days = parseInt(args[3]) || 365;
                if (days === 0) {
                    expiryDate.setFullYear(2100);
                } else {
                    expiryDate.setDate(expiryDate.getDate() + days);
                }
                
                const licenseData = {
                    product_id: args[1],
                    customer_id: args[2],
                    license_type: args[5] || 'machine',
                    expiry_date: expiryDate.toISOString(),
                    max_activations: parseInt(args[4]) || 1,
                    features: []
                };
                
                const result = await admin.createLicense(licenseData);
                if (result.error) {
                    console.error('Error:', result.error);
                } else {
                    console.log('✅ License created:', result.license_key);
                    console.log('📦 Product:', result.product_id);
                    console.log('👤 Customer:', result.customer_id);
                    console.log('📧 Email:', result.customer_email);
                    console.log('🔧 Type:', licenseData.license_type);
                    if (days === 0) {
                        console.log('⏰ Expires: Perpetual');
                    }
                }
                break;

            case 'generate-keys':
                if (args.length < 2) {
                    console.log('Usage: node direct_admin_tools.js generate-keys <count> [format] [prefix]');
                    console.log('Formats: standard, compact, readable, uuid');
                    console.log('Example: node direct_admin_tools.js generate-keys 10 standard TEMPAS');
                    break;
                }
                
                const keyCount = parseInt(args[1]);
                const keyFormat = args[2] || 'standard';
                const keyPrefix = args[3] || '';
                
                console.log(`Generated ${keyCount} license keys:`);
                for (let i = 0; i < keyCount; i++) {
                    const key = admin.generateLicenseKey(keyPrefix, keyFormat);
                    console.log(`${String(i + 1).padStart(3, ' ')}. ${key}`);
                }
                break;

            case 'delete-product':
                if (args.length < 2) {
                    console.log('Usage: node direct_admin_tools.js delete-product <product_id>');
                    break;
                }
                
                const deleteProductResult = await admin.deleteProduct(args[1]);
                if (deleteProductResult.error) {
                    console.error('Error:', deleteProductResult.error);
                } else {
                    console.log(`✅ Product '${args[1]}' deleted successfully`);
                }
                break;

            case 'delete-customer':
                if (args.length < 2) {
                    console.log('Usage: node direct_admin_tools.js delete-customer <customer_id>');
                    break;
                }
                
                const deleteCustomerResult = await admin.deleteCustomer(args[1]);
                if (deleteCustomerResult.error) {
                    console.error('Error:', deleteCustomerResult.error);
                } else {
                    console.log(`✅ Customer '${args[1]}' deleted successfully`);
                }
                break;

            case 'delete-license':
                if (args.length < 2) {
                    console.log('Usage: node direct_admin_tools.js delete-license <license_key>');
                    break;
                }
                
                const deleteLicenseResult = await admin.deleteLicense(args[1]);
                if (deleteLicenseResult.error) {
                    console.error('Error:', deleteLicenseResult.error);
                } else {
                    console.log(`✅ License '${args[1]}' deleted successfully`);
                }
                break;

            case 'revoke':
                if (args.length < 2) {
                    console.log('Usage: node direct_admin_tools.js revoke <license_key>');
                    break;
                }
                
                const revokeResult = await admin.updateLicense(args[1], { status: 'revoked' });
                if (revokeResult.error) {
                    console.error('Error:', revokeResult.error);
                } else {
                    console.log(`✅ License '${args[1]}' revoked successfully`);
                }
                break;

            case 'report':
                const report = await admin.generateReport();
                if (report.error) {
                    console.error('Error:', report.error);
                } else {
                    console.log('📊 License Summary Report');
                    console.log('========================');
                    console.log(`Total Licenses: ${report.total_licenses}`);
                    console.log(`Active Licenses: ${report.active_licenses}`);
                    console.log(`Expired Licenses: ${report.expired_licenses}`);
                    console.log(`Total Activations: ${report.total_activations}`);
                    console.log(`Unique Customers: ${report.unique_customers}`);
                    console.log(`Products: ${report.total_products}`);
                }
                break;

            case 'audit':
                const auditLog = await admin.getAuditLog(null, 10);
                if (auditLog.error) {
                    console.error('Error:', auditLog.error);
                } else {
                    console.log('📜 Recent Audit Log:');
                    admin.formatTable(auditLog, ['timestamp', 'action', 'license_key']);
                }
                break;

            case 'status':
                const customers_status = await admin.listCustomers();
                const products_status = await admin.listProducts();
                const licenses_status = await admin.listLicenses();

                console.log('🔍 Database Status:');
                console.log(`  👥 Customers: ${customers_status.error ? 'ERROR' : customers_status.length + ' records'}`);
                console.log(`  📦 Products: ${products_status.error ? 'ERROR' : products_status.length + ' records'}`);
                console.log(`  🎫 Licenses: ${licenses_status.error ? 'ERROR' : licenses_status.length + ' records'}`);
                break;

            default:
                console.log(`
Direct License Database Management Tool

Usage:
  node direct_admin_tools.js                    # Interactive mode
  node direct_admin_tools.js customers          # List customers
  node direct_admin_tools.js products           # List products  
  node direct_admin_tools.js licenses           # List licenses
  node direct_admin_tools.js create-license <product> <customer> [days] [max] [type]
  node direct_admin_tools.js delete-product <product_id>
  node direct_admin_tools.js delete-customer <customer_id>
  node direct_admin_tools.js delete-license <license_key>
  node direct_admin_tools.js revoke <license_key>
  node direct_admin_tools.js generate-keys <count> [format] [prefix]
  node direct_admin_tools.js report             # Generate summary report
  node direct_admin_tools.js audit              # View recent audit log
  node direct_admin_tools.js status             # Check database status

Examples:
  node direct_admin_tools.js                              # Interactive mode
  node direct_admin_tools.js create-license TEMPAS_PRO ACME 365 3 machine
  node direct_admin_tools.js create-license TEMPAS_ENT CORP 0 10 network    # Perpetual network license
  node direct_admin_tools.js delete-product TEMPAS_BASIC
  node direct_admin_tools.js generate-keys 10 standard TEMPAS
  node direct_admin_tools.js report
  node direct_admin_tools.js status
                `);
        }

    } catch (error) {
        console.error('Database error:', error.message);
    } finally {
        await admin.close();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { DirectLicenseAdmin, DirectInteractiveCLI };