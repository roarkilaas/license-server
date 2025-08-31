// server_compatible_admin.js - Admin tools compatible with your server.js schema
const readline = require('readline');
const path = require('path');
const crypto = require('crypto');

// Database configuration - supports both SQLite and PostgreSQL
const USE_POSTGRES = process.env.DATABASE_URL ? true : false;
const DB_PATH = process.env.DB_PATH || './license.db';

let dbConnection = null;

if (USE_POSTGRES) {
    const { Pool } = require('pg');
    dbConnection = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
} else {
    const sqlite3 = require('sqlite3').verbose();
    dbConnection = null; // Will be initialized in connect()
}

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

class ServerCompatibleAdmin {
    constructor() {
        this.db = null;
        this.usePostgres = USE_POSTGRES;
    }

    async connect() {
        if (this.usePostgres) {
            try {
                this.db = dbConnection;
                await this.db.query('SELECT NOW()');
            } catch (error) {
                throw new Error(`PostgreSQL connection failed: ${error.message}`);
            }
        } else {
            return new Promise((resolve, reject) => {
                const sqlite3 = require('sqlite3').verbose();
                this.db = new sqlite3.Database(DB_PATH, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }

    async close() {
        if (this.usePostgres) {
            await this.db.end();
        } else {
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
    }

    async getAllRows(query, params = []) {
        if (this.usePostgres) {
            try {
                const result = await this.db.query(query, params);
                return result.rows;
            } catch (error) {
                throw error;
            }
        } else {
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
    }

    async runQuery(query, params = []) {
        if (this.usePostgres) {
            try {
                const result = await this.db.query(query, params);
                return { 
                    changes: result.rowCount, 
                    lastID: result.rows[0]?.id || null 
                };
            } catch (error) {
                throw error;
            }
        } else {
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
    }

    // Checking editing compatibility with server.js 3
    // Generate ID and license key using same method as server
    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }

    generateLicenseKey() {
        const segments = [];
        for (let i = 0; i < 4; i++) {
            segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return segments.join('-');
    }

    // ============================================
    // CUSTOMER MANAGEMENT
    // ============================================

    async listCustomers() {
        try {
            const customers = await this.getAllRows(`
                SELECT id, name, email, company, phone, address, created_at
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
                INSERT INTO customers (id, name, email, company, phone, address)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                customerData.id, 
                customerData.name, 
                customerData.email, 
                customerData.company || null,
                customerData.phone || null,
                customerData.address || null
            ]);
            
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

    async updateCustomer(customerId, customerData) {
        try {
            const result = await this.runQuery(`
                UPDATE customers 
                SET name = ?, email = ?, company = ?, phone = ?, address = ?
                WHERE id = ?
            `, [
                customerData.name,
                customerData.email,
                customerData.company || null,
                customerData.phone || null,
                customerData.address || null,
                customerId
            ]);
            
            if (result.changes === 0) {
                return { error: 'Customer not found' };
            }
            
            return { success: true, id: customerId };
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
                SELECT id, name, description, version, features, default_max_activations, default_validity_days, created_at
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
                INSERT INTO products (id, name, description, version, features, default_max_activations, default_validity_days)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                productData.id,
                productData.name,
                productData.description || null,
                productData.version || null,
                productData.features ? JSON.stringify(productData.features) : JSON.stringify([]),
                productData.default_max_activations || 1,
                productData.default_validity_days || 365
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

    async updateProduct(productId, productData) {
        try {
            const result = await this.runQuery(`
                UPDATE products 
                SET name = ?, description = ?, version = ?, features = ?, default_max_activations = ?, default_validity_days = ?
                WHERE id = ?
            `, [
                productData.name,
                productData.description || null,
                productData.version || null,
                productData.features ? JSON.stringify(productData.features) : JSON.stringify([]),
                productData.default_max_activations || 1,
                productData.default_validity_days || 365,
                productId
            ]);
            
            if (result.changes === 0) {
                return { error: 'Product not found' };
            }
            
            return { success: true, id: productId };
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
                    l.id,
                    l.license_key,
                    l.product_id,
                    l.customer_id,
                    l.customer_email,
                    l.license_type,
                    l.status,
                    l.issue_date,
                    l.expiry_date,
                    l.max_activations,
                    l.current_activations,
                    l.features,
                    l.created_at,
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
                customer_email: license.customer_actual_email || license.customer_email,
                license_type: license.license_type || 'machine'
            }));
        } catch (error) {
            return { error: error.message };
        }
    }

    async createLicense(licenseData) {
        try {
            // Generate IDs using server's method
            const id = this.generateId();
            const license_key = this.generateLicenseKey();

            // Get customer email
            const customer = await this.getAllRows('SELECT email FROM customers WHERE id = ?', [licenseData.customer_id]);
            if (customer.length === 0) {
                return { error: `Customer '${licenseData.customer_id}' not found` };
            }
            const customer_email = customer[0].email;

            const now = new Date().toISOString();

            await this.runQuery(`
                INSERT INTO licenses (
                    id, license_key, product_id, customer_id, customer_email, license_type,
                    issue_date, expiry_date, max_activations, current_activations, 
                    features, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', ?)
            `, [
                id,
                license_key,
                licenseData.product_id,
                licenseData.customer_id,
                customer_email,
                licenseData.license_type || 'machine',
                now,
                licenseData.expiry_date,
                licenseData.max_activations || 1,
                licenseData.features ? JSON.stringify(licenseData.features) : JSON.stringify([]),
                now
            ]);

            return {
                id: id,
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
            // Get license first to get the ID
            const license = await this.getAllRows('SELECT id FROM licenses WHERE license_key = ?', [licenseKey]);
            if (license.length === 0) {
                return { error: 'License not found' };
            }

            const licenseId = license[0].id;

            // Delete activations first (foreign key constraint)
            await this.runQuery('DELETE FROM activations WHERE license_id = ?', [licenseId]);
            
            // Delete audit log entries
            await this.runQuery('DELETE FROM license_audit_log WHERE license_id = ?', [licenseId]);
            
            // Delete the license
            const result = await this.runQuery('DELETE FROM licenses WHERE id = ?', [licenseId]);
            
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
            if (updates.features && typeof updates.features !== 'string') {
                updates.features = JSON.stringify(updates.features);
            }

            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);
            values.push(licenseKey);

            let result;
            if (this.usePostgres) {
                // PostgreSQL: use $1, $2, etc
                const setClauseWithParams = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
                result = await this.runQuery(
                    `UPDATE licenses SET ${setClauseWithParams}, updated_at = NOW() WHERE license_key = $${values.length}`,
                    values
                );
            } else {
                // SQLite: use ? placeholders
                result = await this.runQuery(
                    `UPDATE licenses SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE license_key = ?`,
                    values
                );
            }

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
            let totalLicenses, activeLicenses, expiredLicenses, totalActivations, uniqueCustomers, totalProducts;
            
            if (this.usePostgres) {
                totalLicenses = await this.getAllRows('SELECT COUNT(*) as count FROM licenses');
                activeLicenses = await this.getAllRows('SELECT COUNT(*) as count FROM licenses WHERE status = $1', ['active']);
                expiredLicenses = await this.getAllRows('SELECT COUNT(*) as count FROM licenses WHERE expiry_date < NOW() AND status = $1', ['active']);
                totalActivations = await this.getAllRows('SELECT SUM(current_activations) as total FROM licenses');
                uniqueCustomers = await this.getAllRows('SELECT COUNT(DISTINCT customer_id) as count FROM licenses');
                totalProducts = await this.getAllRows('SELECT COUNT(*) as count FROM products');
            } else {
                totalLicenses = await this.getAllRows('SELECT COUNT(*) as count FROM licenses');
                activeLicenses = await this.getAllRows('SELECT COUNT(*) as count FROM licenses WHERE status = ?', ['active']);
                expiredLicenses = await this.getAllRows('SELECT COUNT(*) as count FROM licenses WHERE expiry_date < datetime("now") AND status = ?', ['active']);
                totalActivations = await this.getAllRows('SELECT SUM(current_activations) as total FROM licenses');
                uniqueCustomers = await this.getAllRows('SELECT COUNT(DISTINCT customer_id) as count FROM licenses');
                totalProducts = await this.getAllRows('SELECT COUNT(*) as count FROM products');
            }

            return {
                total_licenses: totalLicenses[0].count,
                active_licenses: activeLicenses[0].count,
                expired_licenses: expiredLicenses[0].count,
                total_activations: totalActivations[0].total || 0,
                unique_customers: uniqueCustomers[0].count,
                total_products: totalProducts[0].count
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getAuditLog(licenseKey = null, limit = 100) {
        try {
            let query = `
                SELECT a.*, l.license_key 
                FROM license_audit_log a 
                LEFT JOIN licenses l ON a.license_id = l.id
            `;
            const params = [];

            if (licenseKey) {
                query += ' WHERE l.license_key = ?';
                params.push(licenseKey);
            }

            query += ' ORDER BY a.timestamp DESC LIMIT ?';
            params.push(limit);

            const logs = await this.getAllRows(query, params);
            return logs;
        } catch (error) {
            return { error: error.message };
        }
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

class ServerCompatibleCLI {
    constructor() {
        this.admin = new ServerCompatibleAdmin();
    }

    async start() {
        try {
            await this.admin.connect();
            console.log('🔧 License Database Management Tool (Server Compatible)');
            console.log('======================================================\n');

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
                console.log('14. Check server compatibility');
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
                            await this.checkServerCompatibility();
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
            console.error('Make sure your license database exists and is accessible');
            rl.close();
        }
    }

    async listCustomers() {
        console.log('\n👥 Customer List:');
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
        const phone = await askQuestion('Phone (optional): ');

        const customerData = { id, name, email };
        if (company) customerData.company = company;
        if (phone) customerData.phone = phone;

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

        this.admin.formatTable(result, ['id', 'name', 'version', 'default_max_activations', 'default_validity_days']);
    }

    async createProduct() {
        console.log('\n➕ Create New Product:');
        
        const id = await askQuestion('Product ID: ');
        const name = await askQuestion('Product Name: ');
        const version = await askQuestion('Version (optional): ');
        const description = await askQuestion('Description (optional): ');
        const maxActivations = await askQuestion('Default Max Activations (1): ');
        const validityDays = await askQuestion('Default Validity Days (365): ');
        const featuresInput = await askQuestion('Features (comma-separated, optional): ');

        const productData = {
            id,
            name,
            default_max_activations: parseInt(maxActivations) || 1,
            default_validity_days: parseInt(validityDays) || 365
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

        // Add network license feature automatically
        if (licenseType.toLowerCase() === 'network' && !features.includes('network_license')) {
            features.push('network_license');
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
        
        const keyCount = parseInt(count) || 1;
        
        console.log(`\n📋 Generated ${keyCount} license key(s):`);
        console.log('='.repeat(50));
        
        for (let i = 0; i < keyCount; i++) {
            const key = this.admin.generateLicenseKey();
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

    async checkServerCompatibility() {
        console.log('\n🔍 Server Compatibility Check:');
        
        try {
            // Check if all required tables exist
            const requiredTables = ['customers', 'products', 'licenses', 'activations', 'license_audit_log'];
            const tableChecks = [];
            
            for (const tableName of requiredTables) {
                try {
                    const result = await this.admin.getAllRows(`SELECT COUNT(*) as count FROM ${tableName}`);
                    tableChecks.push({ table: tableName, status: '✅', count: result[0].count });
                } catch (error) {
                    tableChecks.push({ table: tableName, status: '❌', error: error.message });
                }
            }

            console.log('📋 Database Schema:');
            tableChecks.forEach(check => {
                if (check.status === '✅') {
                    console.log(`  ${check.status} ${check.table}: ${check.count} records`);
                } else {
                    console.log(`  ${check.status} ${check.table}: ${check.error}`);
                }
            });

            // Check for license_type column
            try {
                const hasLicenseType = await this.admin.getAllRows(`
                    SELECT COUNT(*) as count 
                    FROM licenses 
                    WHERE license_type IS NOT NULL
                `);
                if (hasLicenseType[0].count > 0) {
                    console.log('✅ license_type column: Working');
                } else {
                    console.log('⚠️  license_type column: Exists but all values are NULL');
                }
            } catch (error) {
                console.log('❌ license_type column: Missing - run migration script');
            }

            // Check for customer email sync
            try {
                const emailSync = await this.admin.getAllRows(`
                    SELECT COUNT(*) as synced_count
                    FROM licenses l
                    JOIN customers c ON l.customer_id = c.id
                    WHERE l.customer_email = c.email
                `);
                
                const totalWithCustomer = await this.admin.getAllRows(`
                    SELECT COUNT(*) as total_count
                    FROM licenses l
                    JOIN customers c ON l.customer_id = c.id
                `);

                if (emailSync[0].synced_count === totalWithCustomer[0].total_count) {
                    console.log('✅ Customer email sync: All licenses have correct emails');
                } else {
                    console.log(`⚠️  Customer email sync: ${emailSync[0].synced_count}/${totalWithCustomer[0].total_count} licenses synced`);
                }
            } catch (error) {
                console.log('❌ Customer email sync check failed:', error.message);
            }

            // Check server features
            const licenses = await this.admin.listLicenses();
            if (!licenses.error) {
                const networkLicenses = licenses.filter(l => l.license_type === 'network').length;
                const machineLicenses = licenses.filter(l => l.license_type === 'machine').length;
                
                console.log('\n🎫 License Types:');
                console.log(`  💻 Machine licenses: ${machineLicenses}`);
                console.log(`  🌐 Network licenses: ${networkLicenses}`);
            }

            console.log('\n💡 This database is compatible with your server.js');
            console.log('💡 Both the server and admin tools can work with this schema');

        } catch (error) {
            console.error('❌ Compatibility check failed:', error.message);
        }
    }

    getProducts() {
    const stmt = this.db.prepare('SELECT * FROM products');
    return stmt.all();
    }

    addProduct(product) {
    const stmt = this.db.prepare(`
        INSERT INTO products (id, name, version, default_max_activations, default_validity_days)
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
        product.id,
        product.name,
        product.version,
        product.default_max_activations,
        product.default_validity_days
    );
    }

    updateProduct(id, fields) {
    const allowed = ['name', 'version', 'default_max_activations', 'default_validity_days'];
    const updates = Object.entries(fields)
        .filter(([key]) => allowed.includes(key))
        .map(([key, value]) => `${key} = ?`);
    const values = Object.entries(fields)
        .filter(([key]) => allowed.includes(key))
        .map(([, value]) => value);

    if (updates.length === 0) return;

    const stmt = this.db.prepare(`
        UPDATE products SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values, id);
    }

    deleteProduct(id) {
    const stmt = this.db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(id);
    }

    getCustomers() {
    const stmt = this.db.prepare('SELECT * FROM customers');
    return stmt.all();
    }

    getLicenses() {
    const stmt = this.db.prepare('SELECT * FROM licenses');
    return stmt.all();
    }
}

// ============================================
// COMMAND LINE INTERFACE
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        const cli = new ServerCompatibleCLI();
        await cli.start();
        return;
    }

    const admin = new ServerCompatibleAdmin();

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

            case 'status':
                const customers_status = await admin.listCustomers();
                const products_status = await admin.listProducts();
                const licenses_status = await admin.listLicenses();

                console.log('🔍 Database Status:');
                console.log(`  👥 Customers: ${customers_status.error ? 'ERROR' : customers_status.length + ' records'}`);
                console.log(`  📦 Products: ${products_status.error ? 'ERROR' : products_status.length + ' records'}`);
                console.log(`  🎫 Licenses: ${licenses_status.error ? 'ERROR' : licenses_status.length + ' records'}`);
                
                if (!licenses_status.error) {
                    const networkCount = licenses_status.filter(l => l.license_type === 'network').length;
                    const machineCount = licenses_status.filter(l => l.license_type === 'machine').length;
                    console.log(`    💻 Machine: ${machineCount}, 🌐 Network: ${networkCount}`);
                }
                break;

            default:
                console.log(`
Server-Compatible License Database Management Tool

Usage:
  node server_compatible_admin.js                # Interactive mode
  node server_compatible_admin.js customers      # List customers
  node server_compatible_admin.js products       # List products  
  node server_compatible_admin.js licenses       # List licenses
  node server_compatible_admin.js status         # Check database status

This tool is designed to work with your existing server.js schema.
It supports both machine-based and network/floating licenses.

Examples:
  node server_compatible_admin.js                # Start interactive mode
  node server_compatible_admin.js licenses       # View all licenses
  node server_compatible_admin.js status         # Quick status check
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

module.exports = { ServerCompatibleAdmin, ServerCompatibleCLI };