// test_client.js - Simple test client for the SQLite license server
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

class LicenseTestClient {
    constructor(serverUrl = SERVER_URL) {
        this.serverUrl = serverUrl;
    }

    // Test license validation
    async validateLicense(licenseKey, machineId) {
        try {
            const response = await axios.post(`${this.serverUrl}/api/license/validate`, {
                license_key: licenseKey,
                machine_id: machineId,
                timestamp: Math.floor(Date.now() / 1000),
                client_info: {
                    version: '1.0.0',
                    os: process.platform,
                    arch: process.arch
                }
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    }

    // Create a new license (admin function)
    async createLicense(productId, customerId, expiryDays = 365, maxActivations = 1, features = []) {
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiryDays);

            const response = await axios.post(`${this.serverUrl}/api/license/create`, {
                product_id: productId,
                customer_id: customerId,
                expiry_date: expiryDate.toISOString(),
                max_activations: maxActivations,
                features: features
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    }

    // Get license status (admin function)
    async getLicenseStatus(licenseKey) {
        try {
            const response = await axios.get(`${this.serverUrl}/api/license/status/${licenseKey}`);
            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    }

    // Deactivate license on a machine
    async deactivateLicense(licenseKey, machineId) {
        try {
            const response = await axios.post(`${this.serverUrl}/api/license/deactivate`, {
                license_key: licenseKey,
                machine_id: machineId
            });

            return response.data;
        } catch (error) {
            if (error.response) {
                return error.response.data;
            }
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await axios.get(`${this.serverUrl}/health`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
}

// ============================================
// TEST SCENARIOS
// ============================================

async function runTests() {
    const client = new LicenseTestClient();
    
    console.log('🚀 Starting License Server Tests...\n');

    try {
        // 1. Health Check
        console.log('1. Testing health check...');
        const health = await client.healthCheck();
        console.log('✅ Health check passed:', health.status);
        console.log('');

        // 2. Create a test license
        console.log('2. Creating test license...');
        const newLicense = await client.createLicense(
            'TEST_PRODUCT',
            'TEST_CUSTOMER_001',
            30, // 30 days
            2,  // 2 activations
            ['feature1', 'feature2']
        );
        
        if (newLicense.license_key) {
            console.log('✅ License created:', newLicense.license_key);
            const testLicenseKey = newLicense.license_key;
            console.log('');

            // 3. Test first validation (should work)
            console.log('3. Testing first license validation...');
            const validation1 = await client.validateLicense(testLicenseKey, 'machine-001');
            console.log('✅ First validation:', validation1.valid ? 'PASSED' : 'FAILED');
            console.log('   Details:', validation1);
            console.log('');

            // 4. Test second validation same machine (should work)
            console.log('4. Testing second validation (same machine)...');
            const validation2 = await client.validateLicense(testLicenseKey, 'machine-001');
            console.log('✅ Second validation:', validation2.valid ? 'PASSED' : 'FAILED');
            console.log('');

            // 5. Test validation on different machine (should work - 2nd activation)
            console.log('5. Testing validation on different machine...');
            const validation3 = await client.validateLicense(testLicenseKey, 'machine-002');
            console.log('✅ Third validation:', validation3.valid ? 'PASSED' : 'FAILED');
            console.log('');

            // 6. Test validation on third machine (should fail - max activations reached)
            console.log('6. Testing validation on third machine (should fail)...');
            const validation4 = await client.validateLicense(testLicenseKey, 'machine-003');
            console.log('✅ Fourth validation:', validation4.valid ? 'UNEXPECTED PASS' : 'CORRECTLY FAILED');
            console.log('   Reason:', validation4.reason);
            console.log('');

            // 7. Check license status
            console.log('7. Checking license status...');
            const status = await client.getLicenseStatus(testLicenseKey);
            console.log('✅ License status retrieved');
            console.log('   Current activations:', status.current_activations);
            console.log('   Max activations:', status.max_activations);
            console.log('   Expiry:', status.expiry_date);
            console.log('');

            // 8. Test deactivation
            console.log('8. Testing license deactivation...');
            const deactivation = await client.deactivateLicense(testLicenseKey, 'machine-002');
            console.log('✅ Deactivation:', deactivation.success ? 'SUCCESS' : 'FAILED');
            console.log('');

            // 9. Test validation on third machine again (should now work)
            console.log('9. Testing validation on third machine again (should now work)...');
            const validation5 = await client.validateLicense(testLicenseKey, 'machine-003');
            console.log('✅ Fifth validation:', validation5.valid ? 'PASSED' : 'FAILED');
            console.log('');

        } else {
            console.log('❌ Failed to create license:', newLicense);
        }

        // 10. Test invalid license
        console.log('10. Testing invalid license...');
        const invalidValidation = await client.validateLicense('INVALID-LICENSE-KEY', 'machine-001');
        console.log('✅ Invalid license test:', invalidValidation.valid ? 'UNEXPECTED PASS' : 'CORRECTLY FAILED');
        console.log('   Reason:', invalidValidation.reason);
        console.log('');

        // 11. Test with sample license from database
        console.log('11. Testing with sample license from database...');
        const sampleValidation = await client.validateLicense('AAAA-BBBB-CCCC-DDDD', 'sample-machine-001');
        console.log('✅ Sample license test:', sampleValidation.valid ? 'PASSED' : 'FAILED');
        if (!sampleValidation.valid) {
            console.log('   Reason:', sampleValidation.reason);
        }
        console.log('');

        console.log('🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        if (error.response && error.response.data) {
            console.error('   Response:', error.response.data);
        }
    }
}

// ============================================
// ADMIN TOOLS
// ============================================

class LicenseAdmin {
    constructor(serverUrl = SERVER_URL) {
        this.client = new LicenseTestClient(serverUrl);
    }

    // Bulk create licenses
    async bulkCreateLicenses(licenses) {
        const results = [];
        for (const licenseData of licenses) {
            try {
                const result = await this.client.createLicense(
                    licenseData.product_id,
                    licenseData.customer_id,
                    licenseData.expiry_days || 365,
                    licenseData.max_activations || 1,
                    licenseData.features || []
                );
                results.push({ success: true, data: result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }

    // Generate license report
    async generateReport(licenseKeys) {
        const report = [];
        for (const key of licenseKeys) {
            try {
                const status = await this.client.getLicenseStatus(key);
                report.push(status);
            } catch (error) {
                report.push({ license_key: key, error: error.message });
            }
        }
        return report;
    }
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const client = new LicenseTestClient();
    const admin = new LicenseAdmin();

    switch (command) {
        case 'test':
            await runTests();
            break;

        case 'validate':
            if (args.length < 3) {
                console.log('Usage: node test_client.js validate <license_key> <machine_id>');
                return;
            }
            const result = await client.validateLicense(args[1], args[2]);
            console.log(JSON.stringify(result, null, 2));
            break;

        case 'create':
            if (args.length < 3) {
                console.log('Usage: node test_client.js create <product_id> <customer_id> [expiry_days] [max_activations]');
                return;
            }
            const license = await client.createLicense(
                args[1], 
                args[2], 
                parseInt(args[3]) || 365,
                parseInt(args[4]) || 1
            );
            console.log(JSON.stringify(license, null, 2));
            break;

        case 'status':
            if (args.length < 2) {
                console.log('Usage: node test_client.js status <license_key>');
                return;
            }
            const status = await client.getLicenseStatus(args[1]);
            console.log(JSON.stringify(status, null, 2));
            break;

        case 'deactivate':
            if (args.length < 3) {
                console.log('Usage: node test_client.js deactivate <license_key> <machine_id>');
                return;
            }
            const deactivation = await client.deactivateLicense(args[1], args[2]);
            console.log(JSON.stringify(deactivation, null, 2));
            break;

        case 'health':
            const health = await client.healthCheck();
            console.log(JSON.stringify(health, null, 2));
            break;

        default:
            console.log(`
License Server Test Client

Commands:
  test                                           Run all tests
  validate <license_key> <machine_id>           Validate a license
  create <product_id> <customer_id> [days] [max] Create a new license
  status <license_key>                          Get license status
  deactivate <license_key> <machine_id>         Deactivate license
  health                                        Check server health

Examples:
  node test_client.js test
  node test_client.js validate AAAA-BBBB-CCCC-DDDD my-machine-123
  node test_client.js create MY_PRODUCT CUSTOMER_001 30 2
  node test_client.js status AAAA-BBBB-CCCC-DDDD
            `);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { LicenseTestClient, LicenseAdmin };