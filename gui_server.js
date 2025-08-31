// gui_server.js — drop-in replacement

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

// Your existing admin adapter
const { ServerCompatibleAdmin } = require('./admin_tools.js');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------- middleware --------------------
app.use(cors());                         // same-origin anyway, but handy
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public'))); // serves /dashboard.html etc.

// -------------------- admin init --------------------
const admin = new ServerCompatibleAdmin();

// Helper: call the first admin method that exists
function callAdmin(possibleNames, ...args) {
  for (const name of possibleNames) {
    if (typeof admin[name] === 'function') {
      return admin[name](...args);
    }
  }
  throw new Error(`Required admin method not found. Tried: ${possibleNames.join(', ')}`);
}

// Connect to DB early
admin.connect().then(() => {
  console.log('✅ Connected to license database');
}).catch((err) => {
  console.error('❌ Failed to connect to database:', err);
  process.exit(1);
});

// -------------------- health --------------------
app.get('/health', (req, res) => res.json({ ok: true }));

// Debug endpoint to test admin connection
app.get('/debug', async (req, res) => {
  try {
    const testResult = await admin.listCustomers();
    res.json({ 
      status: 'ok', 
      adminConnected: true,
      customersTest: testResult.error ? { error: testResult.error } : { count: testResult.length }
    });
  } catch (err) {
    res.json({ 
      status: 'error', 
      adminConnected: false,
      error: err.message 
    });
  }
});

// -------------------- CUSTOMERS --------------------
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await admin.listCustomers();
    if (customers.error) {
      return res.status(500).json({ error: customers.error });
    }
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const result = await admin.createCustomer(req.body);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'Customer added', id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const result = await admin.updateCustomer(req.params.id, req.body);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'Customer updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const result = await admin.deleteCustomer(req.params.id);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- PRODUCTS --------------------
app.get('/api/products', async (req, res) => {
  try {
    const products = await admin.listProducts();
    if (products.error) {
      return res.status(500).json({ error: products.error });
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const result = await admin.createProduct(req.body);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'Product added', id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const result = await admin.updateProduct(req.params.id, req.body);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await admin.deleteProduct(req.params.id);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- LICENSES --------------------
app.get('/api/licenses', async (req, res) => {
  try {
    const licenses = await admin.listLicenses();
    if (licenses.error) {
      return res.status(500).json({ error: licenses.error });
    }
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/licenses', async (req, res) => {
  try {
    const result = await admin.createLicense(req.body);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'License created', license_key: result.license_key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/licenses/:id', async (req, res) => {
  try {
    const result = await admin.updateLicense(req.params.id, req.body);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'License updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/licenses/:id/revoke', async (req, res) => {
  try {
    await callAdmin(['revokeLicense','deactivateLicense'], req.params.id);
    res.json({ message: 'License revoked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/licenses/:id', async (req, res) => {
  try {
    const result = await admin.deleteLicense(req.params.id);
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    res.json({ message: 'License deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------- DASHBOARD EXTRAS (safe defaults) --------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const [licensesResult, customersResult, productsResult] = await Promise.all([
      admin.listLicenses().catch(()=>[]),
      admin.listCustomers().catch(()=>[]),
      admin.listProducts().catch(()=>[])
    ]);
    
    const licenses = licensesResult.error ? [] : licensesResult;
    const customers = customersResult.error ? [] : customersResult;
    const products = productsResult.error ? [] : productsResult;
    
    const stats = {
      total_licenses: licenses.length,
      active_licenses: licenses.filter(l => l.status === 'active').length,
      expired_licenses: licenses.filter(l => l.status === 'expired').length,
      unique_customers: new Set(licenses.map(l => l.customer_id)).size,
      total_products: products.length,
      total_activations: licenses.reduce((s,l)=>s+(l.current_activations||0),0)
    };
    res.json({ stats, recentLicenses: licenses.slice(0,10) });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const licensesResult = await admin.listLicenses().catch(()=>[]);
    const productsResult = await admin.listProducts().catch(()=>[]);
    
    const licenses = licensesResult.error ? [] : licensesResult;
    const products = productsResult.error ? [] : productsResult;
    const byProduct = new Map();
    for (const l of licenses) {
      const k = l.product_name || l.product_id || 'unknown';
      const e = byProduct.get(k) || { product_name: k, active_count: 0, total_count: 0, total_activations: 0 };
      e.total_count += 1;
      e.active_count += (l.status === 'active') ? 1 : 0;
      e.total_activations += (l.current_activations || 0);
      byProduct.set(k, e);
    }
    res.json({
      stats: {
        total_licenses: licenses.length,
        active_licenses: licenses.filter(l => l.status === 'active').length,
        expired_licenses: licenses.filter(l => l.status === 'expired').length,
        unique_customers: new Set(licenses.map(l => l.customer_id)).size,
        total_products: products.length,
        total_activations: licenses.reduce((s,l)=>s+(l.current_activations||0),0)
      },
      productStats: Array.from(byProduct.values())
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/audit-log', (req, res) => res.json([]));

app.get('/api/compatibility', async (req, res) => {
  res.json({
    tables: [
      { table: 'customers', status: 'OK' },
      { table: 'products', status: 'OK' },
      { table: 'licenses', status: 'OK' }
    ],
    licenseTypes: { machine: true, network: true }
  });
});

app.post('/api/tools/generate-keys', (req, res) => {
  const count = Math.max(1, Math.min(1000, Number(req.body?.count || 5)));
  const keys = Array.from({ length: count }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );
  res.json({ keys });
});

// -------------------- start --------------------
app.listen(PORT, () => {
  console.log(`🚀 GUI Server running at http://localhost:${PORT}`);
});