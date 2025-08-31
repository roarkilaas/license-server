PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE licenses (
            id TEXT PRIMARY KEY,
            license_key TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            customer_email TEXT,
            issue_date TIMESTAMP DEFAULT NOW(),
            expiry_date DATETIME NOT NULL,
            max_activations INTEGER DEFAULT 1,
            current_activations INTEGER DEFAULT 0,
            features TEXT DEFAULT '[]',
            status TEXT DEFAULT 'active' )
            metadata TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        , license_type TEXT DEFAULT 'machine');
INSERT INTO licenses VALUES('32fd3caeaef335609aaf9e625d56a471','592DA8F1-4DE7A92B-8CC82BDF-F211968F','TEST_PRODUCT','TEST_CUSTOMER_001',NULL,'2025-07-06T23:17:18.998Z','2025-08-05T23:17:18.991Z',2,2,'["feature1","feature2"]','active','{}','2025-07-06 23:17:18','2025-07-06 23:17:18','machine');
INSERT INTO licenses VALUES('b896dbde325773a722e7fdd3cbee4890','1CF61E63-F6BAE682-8B61697F-E744A282','TEST_PRODUCT','TEST_CUSTOMER_001',NULL,'2025-07-07T00:08:18.452Z','2025-08-06T00:08:18.442Z',2,2,'["feature1","feature2"]','active','{}','2025-07-07 00:08:18','2025-07-07 00:08:18','machine');
INSERT INTO licenses VALUES('c5785c0cecc3a37696fafce0554aa798','E4DCA9D6-C7990E52-F7760453-204962A0','TEMPAS_PRO','CUST003','roar@totalresolution.com','2025-07-07T06:13:37.334Z','2026-07-07T06:13:37.328Z',3,3,'["scripting","reconstruction"]','active','{}','2025-07-07 06:13:37','2025-07-07 06:13:37','machine');
INSERT INTO licenses VALUES('b45c9524cfae1ba86d1d12ac03caf02b','42AEEFC5-2B1CE0B0-849272A8-9B492D5B','CRYSTALKIT','CUST003','roar@totalresolution.com','2025-07-07T06:45:02.025Z','2026-07-07T06:45:02.022Z',10,4,'[]','active','{}','2025-07-07 06:45:02','2025-07-07 06:45:02','machine');
INSERT INTO licenses VALUES('4c0daf3f57de0e5079c951720f065ac2','859B5DEC-D4285817-088F6941-1C10D706','XWAVE','CUST003','roar@totalresolution.com','2025-07-07T22:02:20.724Z','2100-07-07T22:02:20.717Z',5,1,'["scripting"]','active','{}','2025-07-07 22:02:20','2025-07-07 22:02:20','network');
INSERT INTO licenses VALUES('3c02c144d124e28877ada13a03b97956','26CDF141-EF8EFCA2-CC48754D-C5EE5E8E','CRYSTALKIT','CUST001','john@example.com','2025-08-30T05:56:54.351Z','2025-08-29T23:59:59.999Z',1,0,'[]','active','{}','2025-08-30T05:56:54.351Z','2025-08-30 05:56:54','machine');
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
        );
INSERT INTO activations VALUES('5825778c101ec133466de78783ee3dd8','32fd3caeaef335609aaf9e625d56a471','d99026efedcc9b8adc9fed43fcc9f219b8b429b166046707de1da225038f79f8','2025-07-06T23:17:19.002Z','2025-07-06 23:17:19','{"version":"1.0.0","os":"darwin","arch":"arm64"}',NULL,NULL,'2025-07-06 23:17:19');
INSERT INTO activations VALUES('4fc588b7b7250c029064da3b0adb7bd7','32fd3caeaef335609aaf9e625d56a471','90c4503e4b7757a446ccf44c7e7fd353ff72d8bb81e967629b2d8597e644223e','2025-07-06T23:17:19.019Z','2025-07-06T23:17:19.019Z','{"version":"1.0.0","os":"darwin","arch":"arm64"}',NULL,NULL,'2025-07-06 23:17:19');
INSERT INTO activations VALUES('400bdc58c75870ef84852514af90952f','b896dbde325773a722e7fdd3cbee4890','d99026efedcc9b8adc9fed43fcc9f219b8b429b166046707de1da225038f79f8','2025-07-07T00:08:18.456Z','2025-07-07 00:08:18','{"version":"1.0.0","os":"darwin","arch":"arm64"}',NULL,NULL,'2025-07-07 00:08:18');
INSERT INTO activations VALUES('598bf9cb2e020329dc87e1b1e679aad3','b896dbde325773a722e7fdd3cbee4890','90c4503e4b7757a446ccf44c7e7fd353ff72d8bb81e967629b2d8597e644223e','2025-07-07T00:08:18.472Z','2025-07-07T00:08:18.472Z','{"version":"1.0.0","os":"darwin","arch":"arm64"}',NULL,NULL,'2025-07-07 00:08:18');
INSERT INTO activations VALUES('bd639f95fb44e1a4edda04a3aff62a4b','c5785c0cecc3a37696fafce0554aa798','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10','2025-07-07T07:02:30.003Z','2025-07-12 02:59:13','{}',NULL,NULL,'2025-07-07 07:02:30');
INSERT INTO activations VALUES('e9aac5a57b2d7d2fc878e697ae552f68','b45c9524cfae1ba86d1d12ac03caf02b','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10','2025-07-08T05:42:27.491Z','2025-07-12 04:55:14','{"type":"tempas_client","version":"1.0.0"}',NULL,NULL,'2025-07-08 05:42:27');
INSERT INTO activations VALUES('86cb4c34cb55a677302593f7906455f6','b45c9524cfae1ba86d1d12ac03caf02b','9b024fe3cc08d91c79d27dcd5e9bfd985c5491f7d17202fd539a6cb74f55b9b2','2025-07-12T03:42:31.576Z','2025-07-12 03:44:30','{"type":"crystalkit_client","version":"1.0.0"}',NULL,NULL,'2025-07-12 03:42:31');
INSERT INTO activations VALUES('107c1d8758850e7d871910e87a320155','b45c9524cfae1ba86d1d12ac03caf02b','7867db0eb9000f5df38c4692f5d76c764a4f75e3e7367240c7157f8a52a4dda9','2025-07-12T05:35:05.813Z','2025-07-12 08:11:09','{"type":"crystalkit_client","version":"1.0.0"}',NULL,NULL,'2025-07-12 05:35:05');
INSERT INTO activations VALUES('3414c0379622eb0739629432b17ec7fe','b45c9524cfae1ba86d1d12ac03caf02b','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5','2025-07-12T07:26:22.322Z','2025-07-15 21:22:31','{"type":"crystalkit_client","version":"1.0.0"}',NULL,NULL,'2025-07-12 07:26:22');
INSERT INTO activations VALUES('5b6d538ae180e25800a8fddfa1743126','c5785c0cecc3a37696fafce0554aa798','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5','2025-07-13T01:05:17.540Z','2025-07-15 21:23:23','{"type":"crystalkit_client","version":"1.0.0"}',NULL,NULL,'2025-07-13 01:05:17');
INSERT INTO activations VALUES('3069f684a95c7dcc25c63991c430e0b4','c5785c0cecc3a37696fafce0554aa798','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b','2025-08-06T00:15:53.579Z','2025-08-12 03:35:54','{"type":"tempas_client","version":"1.0.0"}',NULL,NULL,'2025-08-06 00:15:53');
CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            version TEXT,
            features TEXT DEFAULT '[]',
            default_max_activations INTEGER DEFAULT 1,
            default_validity_days INTEGER DEFAULT 365,
            created_at TIMESTAMP DEFAULT NOW()
        );
INSERT INTO products VALUES('MYAPP_PRO','MyApp Professional','Professional version with advanced features',NULL,'["advanced_reporting", "api_access", "premium_support"]',3,365,'2025-07-06 23:07:42');
INSERT INTO products VALUES('MYAPP_BASIC','MyApp Basic','Basic version with standard features',NULL,'["basic_features", "standard_support"]',1,365,'2025-07-06 23:07:42');
INSERT INTO products VALUES('TEMPAS','Tempas','Tempas Base Application','3','[]',1,365,'2025-07-07 03:18:25');
INSERT INTO products VALUES('CRYSTALKIT','CrystalKit','CrystalKit Application','2','[]',1,365,'2025-07-07 03:19:13');
INSERT INTO products VALUES('TEMPAS_PRO','Tempas','Tempas with optional modules','3','["scripting","reconstruction"]',1,365,'2025-07-07 03:32:18');
INSERT INTO products VALUES('XWAVE','XWave',NULL,NULL,'[]',1,365,'2025-07-07 22:00:46');
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
        );
INSERT INTO customers VALUES('CUST001','John Doe','john@example.com','Example Corp',NULL,NULL,'{}','2025-07-06 23:07:42','2025-07-06 23:07:42');
INSERT INTO customers VALUES('CUST003','Roar Kilaas','roar@totalresolution.com','Total Resolution LLC','+15105010860','20 Florida Ave, Berkeley CA 94707, USA','{}','2025-07-07','2025-07-07');
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
        );
INSERT INTO license_audit_log VALUES('8944b7b7516e97b365b2949b2dbc2922','32fd3caeaef335609aaf9e625d56a471','activated','d99026efedcc9b8adc9fed43fcc9f219b8b429b166046707de1da225038f79f8',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-06 23:17:19');
INSERT INTO license_audit_log VALUES('d257c6ce3b893e0948a7dbd50b8894b4','32fd3caeaef335609aaf9e625d56a471','validated','d99026efedcc9b8adc9fed43fcc9f219b8b429b166046707de1da225038f79f8',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-06 23:17:19');
INSERT INTO license_audit_log VALUES('f2868aec8d399ecaf576fb6a93a8de35','32fd3caeaef335609aaf9e625d56a471','activated','dca0305b6c3f45b67a10b033c523784cdcb691b59b5e236bcbadb9a1958254b9',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-06 23:17:19');
INSERT INTO license_audit_log VALUES('3cedd546382533beb9d531d1b39b01d0','32fd3caeaef335609aaf9e625d56a471','activation_rejected','90c4503e4b7757a446ccf44c7e7fd353ff72d8bb81e967629b2d8597e644223e',NULL,NULL,'{"reason":"max_activations_reached"}','2025-07-06 23:17:19');
INSERT INTO license_audit_log VALUES('c56d29fb96ab4711d1de2efeca766699','32fd3caeaef335609aaf9e625d56a471','deactivated','dca0305b6c3f45b67a10b033c523784cdcb691b59b5e236bcbadb9a1958254b9',NULL,NULL,'{}','2025-07-06 23:17:19');
INSERT INTO license_audit_log VALUES('a99f02b58cd0fe60734d9d8dc50eeda1','32fd3caeaef335609aaf9e625d56a471','activated','90c4503e4b7757a446ccf44c7e7fd353ff72d8bb81e967629b2d8597e644223e',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-06 23:17:19');
INSERT INTO license_audit_log VALUES('194f1fc66ac3fe0801072236305108f8','b896dbde325773a722e7fdd3cbee4890','activated','d99026efedcc9b8adc9fed43fcc9f219b8b429b166046707de1da225038f79f8',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-07 00:08:18');
INSERT INTO license_audit_log VALUES('695ae82223a6d336a3d0a3e541f2c308','b896dbde325773a722e7fdd3cbee4890','validated','d99026efedcc9b8adc9fed43fcc9f219b8b429b166046707de1da225038f79f8',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-07 00:08:18');
INSERT INTO license_audit_log VALUES('d08d45b6e2ca602b5d83488e7ec30749','b896dbde325773a722e7fdd3cbee4890','activated','dca0305b6c3f45b67a10b033c523784cdcb691b59b5e236bcbadb9a1958254b9',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-07 00:08:18');
INSERT INTO license_audit_log VALUES('a9586e7b981b6cc73b31b00dc467d0ff','b896dbde325773a722e7fdd3cbee4890','activation_rejected','90c4503e4b7757a446ccf44c7e7fd353ff72d8bb81e967629b2d8597e644223e',NULL,NULL,'{"reason":"max_activations_reached"}','2025-07-07 00:08:18');
INSERT INTO license_audit_log VALUES('f4828115632f9b1c36448f45b0fb76ec','b896dbde325773a722e7fdd3cbee4890','deactivated','dca0305b6c3f45b67a10b033c523784cdcb691b59b5e236bcbadb9a1958254b9',NULL,NULL,'{}','2025-07-07 00:08:18');
INSERT INTO license_audit_log VALUES('9b50321357b5924b60fe89b81ef64add','b896dbde325773a722e7fdd3cbee4890','activated','90c4503e4b7757a446ccf44c7e7fd353ff72d8bb81e967629b2d8597e644223e',NULL,NULL,'{"version":"1.0.0","os":"darwin","arch":"arm64"}','2025-07-07 00:08:18');
INSERT INTO license_audit_log VALUES('b86f8664a33f6afce881af2fcccff700','c5785c0cecc3a37696fafce0554aa798','activated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:02:30');
INSERT INTO license_audit_log VALUES('8bf89ffeff7f5e84b82daa9774a1140c','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:15:16');
INSERT INTO license_audit_log VALUES('52f114b032215590b3e50e8bc5eb8438','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:18:02');
INSERT INTO license_audit_log VALUES('fdf488abcb5650926378a1fa7060f6e8','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:34:43');
INSERT INTO license_audit_log VALUES('bc0d231d1b38b2547ccf310b3b4ae264','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:35:20');
INSERT INTO license_audit_log VALUES('4adf1287311e392e98a189208dd35185','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:37:55');
INSERT INTO license_audit_log VALUES('d750b6570eb781ee0b3886437c58f574','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:40:20');
INSERT INTO license_audit_log VALUES('1a5155678616569ef2f524c544ce60d0','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:41:30');
INSERT INTO license_audit_log VALUES('075dbb85d23fe5d23586163eb9960c42','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:43:45');
INSERT INTO license_audit_log VALUES('948f7f86c9c259f5a851980d891c012b','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:46:04');
INSERT INTO license_audit_log VALUES('3021e22fbb8440cfb6dd3d8400aec2ad','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:48:50');
INSERT INTO license_audit_log VALUES('e1391eb1cc355b9fe36c8aa990798b2c','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 07:50:15');
INSERT INTO license_audit_log VALUES('ac6a34817e73e05f89cd0b4545ad00fa','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{}','2025-07-07 08:08:00');
INSERT INTO license_audit_log VALUES('77a4bf4dcff9817a237cf138f0ec5b0d','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-07 08:57:55');
INSERT INTO license_audit_log VALUES('45323d523cda4bc6f518c03d672b87ea','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-07 08:59:29');
INSERT INTO license_audit_log VALUES('cacf7394315fe851c2d27fdc3f0f6caf','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-07 09:31:33');
INSERT INTO license_audit_log VALUES('f5e87d062be69304d536d09a4c01f157','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-07 23:21:15');
INSERT INTO license_audit_log VALUES('236d2aea9d75e7bd3b09a78d0d26b257','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-07 23:49:15');
INSERT INTO license_audit_log VALUES('4c3b939851b65eca5f002a893ccc83a0','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-07 23:49:47');
INSERT INTO license_audit_log VALUES('1336327004029cfab7bbcf3278b7bc5e','b45c9524cfae1ba86d1d12ac03caf02b','activated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-08 05:42:27');
INSERT INTO license_audit_log VALUES('f7d2bcafa8f73435195e6553b31696a8','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-08 05:48:34');
INSERT INTO license_audit_log VALUES('ae6e7ddecc1ab825ffcf32922bc1d56c','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-08 05:53:37');
INSERT INTO license_audit_log VALUES('fa25f39f24b1b9f9cacc909af78d8f97','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-08 05:56:07');
INSERT INTO license_audit_log VALUES('7acc8cb5c0e1b0c0e4f4dbf42e4a42c3','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-08 06:02:32');
INSERT INTO license_audit_log VALUES('de3c2ca1a9d00464ba6ae32c63e6f48c','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-08 06:04:06');
INSERT INTO license_audit_log VALUES('7b052c4809c42348742bed3c2ff0fcf2','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-08 06:29:57');
INSERT INTO license_audit_log VALUES('ed31582404c95b686d081320fcf49f4e','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-08 06:37:37');
INSERT INTO license_audit_log VALUES('6312718ac9ec262752de4c44e1a6d3e9','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-08 06:44:13');
INSERT INTO license_audit_log VALUES('9f5e06c05901446abfe0c178e5295d1f','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-08 06:58:49');
INSERT INTO license_audit_log VALUES('a1a46a6a20e6a1e45d9b76b3ead5170f','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-08 06:59:44');
INSERT INTO license_audit_log VALUES('392ef7d06a87ebdb811d8ba98efc6d75','4c0daf3f57de0e5079c951720f065ac2','activated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"xwave_client","version":"1.0.0"}','2025-07-08 10:27:52');
INSERT INTO license_audit_log VALUES('005706e2c259f185c2b48a4bedf9dc4a','4c0daf3f57de0e5079c951720f065ac2','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"xwave_client","version":"1.0.0"}','2025-07-08 10:31:09');
INSERT INTO license_audit_log VALUES('7137bff03679d46fbef6d06f906cd578','4c0daf3f57de0e5079c951720f065ac2','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"xwave_client","version":"1.0.0"}','2025-07-08 10:34:13');
INSERT INTO license_audit_log VALUES('dde6465b58f54c461799444100ffa7a7','4c0daf3f57de0e5079c951720f065ac2','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"xwave_client","version":"1.0.0"}','2025-07-08 10:37:56');
INSERT INTO license_audit_log VALUES('8681dd25caa528894749bf8229291dbe','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"xwave_client","version":"1.0.0"}','2025-07-09 00:10:40');
INSERT INTO license_audit_log VALUES('964943da1c855150ddb737596751dff6','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-09 00:23:23');
INSERT INTO license_audit_log VALUES('ab7ea6d7488980ffa30f44f9dd60f336','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-09 00:25:18');
INSERT INTO license_audit_log VALUES('550a1987e269f7e5984fa66566d58ba6','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-09 00:26:47');
INSERT INTO license_audit_log VALUES('872c6b31410671e3acda898030d086ae','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-09 00:27:57');
INSERT INTO license_audit_log VALUES('fe83e66422f3ead36c4397a4bcc157c1','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-09 00:30:17');
INSERT INTO license_audit_log VALUES('6d1a4f8f2f9afc569366cbec9de76bff','c5785c0cecc3a37696fafce0554aa798','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-07-12 02:59:13');
INSERT INTO license_audit_log VALUES('f3f316fe999e3222f7bdbad7670b5d8c','b45c9524cfae1ba86d1d12ac03caf02b','activated','9b024fe3cc08d91c79d27dcd5e9bfd985c5491f7d17202fd539a6cb74f55b9b2',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 03:42:31');
INSERT INTO license_audit_log VALUES('2e6e79d1f6f306a87c54c567c436dd89','b45c9524cfae1ba86d1d12ac03caf02b','validated','9b024fe3cc08d91c79d27dcd5e9bfd985c5491f7d17202fd539a6cb74f55b9b2',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 03:43:17');
INSERT INTO license_audit_log VALUES('ff44c2a7c6b0868e58fec74bc03ad690','b45c9524cfae1ba86d1d12ac03caf02b','validated','9b024fe3cc08d91c79d27dcd5e9bfd985c5491f7d17202fd539a6cb74f55b9b2',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 03:44:30');
INSERT INTO license_audit_log VALUES('6985806de05b52791ac07871c0093a58','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 03:50:59');
INSERT INTO license_audit_log VALUES('c3a4ba16386ec20bcb04fdc10d61ed14','b45c9524cfae1ba86d1d12ac03caf02b','validated','8ec63ec27f5dbcaf186769c4f135a65485830e2aa61c1044e16945032c57af10',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 04:55:14');
INSERT INTO license_audit_log VALUES('9c6aba513134d49f22caa44c6ebe8e4c','b45c9524cfae1ba86d1d12ac03caf02b','activated','7867db0eb9000f5df38c4692f5d76c764a4f75e3e7367240c7157f8a52a4dda9',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 05:35:05');
INSERT INTO license_audit_log VALUES('670d228a35b60c9bcdea0be933b88c37','b45c9524cfae1ba86d1d12ac03caf02b','validated','7867db0eb9000f5df38c4692f5d76c764a4f75e3e7367240c7157f8a52a4dda9',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 05:58:40');
INSERT INTO license_audit_log VALUES('360e33ba4a9af29e45cf7bef17007a46','b45c9524cfae1ba86d1d12ac03caf02b','validated','7867db0eb9000f5df38c4692f5d76c764a4f75e3e7367240c7157f8a52a4dda9',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 06:54:11');
INSERT INTO license_audit_log VALUES('5c5f00ce76b9d8d1b86b600d159f80b1','b45c9524cfae1ba86d1d12ac03caf02b','validated','7867db0eb9000f5df38c4692f5d76c764a4f75e3e7367240c7157f8a52a4dda9',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 07:07:48');
INSERT INTO license_audit_log VALUES('d649f53849818ba4f900b1039a577077','b45c9524cfae1ba86d1d12ac03caf02b','activation_rejected','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"reason":"max_activations_reached"}','2025-07-12 07:22:35');
INSERT INTO license_audit_log VALUES('7353d2325cf13b25331a0a4f711eb7b4','b45c9524cfae1ba86d1d12ac03caf02b','activated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 07:26:22');
INSERT INTO license_audit_log VALUES('d7917c5b3efaa5dcba97e3f3491503dc','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 07:39:28');
INSERT INTO license_audit_log VALUES('2b11f852ce944695fa88dfc0a73a4ca0','b45c9524cfae1ba86d1d12ac03caf02b','validated','7867db0eb9000f5df38c4692f5d76c764a4f75e3e7367240c7157f8a52a4dda9',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 08:11:09');
INSERT INTO license_audit_log VALUES('16035735c80d39b80b84c06160aca21c','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 22:39:41');
INSERT INTO license_audit_log VALUES('bb9bbc4cc53ec251b16249edc3383034','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 23:22:54');
INSERT INTO license_audit_log VALUES('60555a29b3eb2aa48f9c08ced4b5399b','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-12 23:30:54');
INSERT INTO license_audit_log VALUES('11ba562c59a8910af1adab1b56a767ac','c5785c0cecc3a37696fafce0554aa798','activated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-13 01:05:17');
INSERT INTO license_audit_log VALUES('1523766970bc06ee7310af1f64d51e4a','c5785c0cecc3a37696fafce0554aa798','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-13 01:27:51');
INSERT INTO license_audit_log VALUES('936e314010cb9e4d1ba4b35cebaf807b','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-13 02:36:34');
INSERT INTO license_audit_log VALUES('6ecada5ff85897f9b0ab929c7747bf8b','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-13 03:06:11');
INSERT INTO license_audit_log VALUES('5b55b28af6339ae444a169d28aadb6cc','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-15 21:21:48');
INSERT INTO license_audit_log VALUES('5fc686e4c789607e2bff404f614f17e1','b45c9524cfae1ba86d1d12ac03caf02b','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-15 21:22:31');
INSERT INTO license_audit_log VALUES('45626b8cc6fc2e898fee7d1ce613d1cb','c5785c0cecc3a37696fafce0554aa798','validated','4a49a5cba983729b8b8c7c7c166e34ca552e71fcb54eecbfa0d4e427ab9be4d5',NULL,NULL,'{"type":"crystalkit_client","version":"1.0.0"}','2025-07-15 21:23:23');
INSERT INTO license_audit_log VALUES('180c3aea6d3581cf3632b35188e5e841','c5785c0cecc3a37696fafce0554aa798','activated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-06 00:15:53');
INSERT INTO license_audit_log VALUES('fd577e054759302e305a782c4eb28ea1','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-06 00:30:46');
INSERT INTO license_audit_log VALUES('893182748195ff132d9c5d7c151e947e','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-06 00:51:00');
INSERT INTO license_audit_log VALUES('840742fa5488f1ce41413d59f94a1c4f','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-06 00:54:22');
INSERT INTO license_audit_log VALUES('c4e569569c5e931a93e50d897812ea28','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-06 00:56:56');
INSERT INTO license_audit_log VALUES('d505d222bf8a3a8cc69171d51e04ae59','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-06 01:05:02');
INSERT INTO license_audit_log VALUES('989020277f010819294099a480195930','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 00:13:50');
INSERT INTO license_audit_log VALUES('00cd72fb4eac3f130a35cb4e34f8803b','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 00:41:03');
INSERT INTO license_audit_log VALUES('13c3ea0101c67df6ecb4f1c42a68f3fa','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 01:22:53');
INSERT INTO license_audit_log VALUES('4d60008f747a0195f849b71fbfaf1c84','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 02:21:15');
INSERT INTO license_audit_log VALUES('0d6899c1ab37459917eaf15dce380d70','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 02:50:44');
INSERT INTO license_audit_log VALUES('c095fc9f5cb86e7bdb7bb5911b675809','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 03:10:32');
INSERT INTO license_audit_log VALUES('1e391b03be1750332a8af20e3956a524','c5785c0cecc3a37696fafce0554aa798','validated','c0efbd18eadedb7e86a6fe9cb0e70feb7971c9149e6314a592ed30d8a3ec401b',NULL,NULL,'{"type":"tempas_client","version":"1.0.0"}','2025-08-12 03:35:54');
INSERT INTO license_audit_log VALUES('1e5aa26dc598d7249ca18efea77e6664','c5785c0cecc3a37696fafce0554aa798','activation_rejected','fe7bac57ea172b3479067d63a19a6ee8526d25ca4a66b632a85ec6102513358c',NULL,NULL,'{"reason":"max_activations_reached"}','2025-08-12 11:12:58');
INSERT INTO license_audit_log VALUES('de7b2b208102c9ec82c39849f0c4ecdc','c5785c0cecc3a37696fafce0554aa798','activation_rejected','fe7bac57ea172b3479067d63a19a6ee8526d25ca4a66b632a85ec6102513358c',NULL,NULL,'{"reason":"max_activations_reached"}','2025-08-12 11:13:53');
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
CREATE INDEX idx_licenses_customer_id ON licenses(customer_id);
CREATE INDEX idx_licenses_product_id ON licenses(product_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_activations_license_id ON activations(license_id);
CREATE INDEX idx_activations_machine_fingerprint ON activations(machine_fingerprint);
CREATE TRIGGER sync_customer_email_on_insert
                AFTER INSERT ON licenses
                FOR EACH ROW
                BEGIN
                    UPDATE licenses 
                    SET customer_email = (
                        SELECT email FROM customers WHERE id = NEW.customer_id
                    )
                    WHERE license_key = NEW.license_key
                    AND NEW.customer_id IS NOT NULL;
                END;
CREATE TRIGGER sync_customer_email_on_customer_update
                AFTER UPDATE OF email ON customers
                FOR EACH ROW
                BEGIN
                    UPDATE licenses 
                    SET customer_email = NEW.email 
                    WHERE customer_id = NEW.id;
                END;
CREATE TRIGGER sync_customer_email_on_license_update
                AFTER UPDATE OF customer_id ON licenses
                FOR EACH ROW
                BEGIN
                    UPDATE licenses 
                    SET customer_email = (
                        SELECT email FROM customers WHERE id = NEW.customer_id
                    )
                    WHERE license_key = NEW.license_key
                    AND NEW.customer_id IS NOT NULL;
                END;
COMMIT;
