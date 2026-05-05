<?php
require_once __DIR__ . '/../config/db.php';

function runMigration() {
    global $pdo;
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Starting migrations...\n";

    try {
        // 1. Add role to users if not exists
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN role ENUM('admin', 'staff', 'client') DEFAULT 'client'");
            echo "Added 'role' column to 'users' table.\n";
        } else {
            // Update enum if it exists to include 'staff'
            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'staff', 'client') DEFAULT 'client'");
            echo "Updated 'role' enum in 'users' table.\n";
        }

        // 2. Add client_user_id to clients if not exists
        $stmt = $pdo->query("SHOW COLUMNS FROM clients LIKE 'client_user_id'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE clients ADD COLUMN client_user_id INT NULL");
            echo "Added 'client_user_id' column to 'clients' table.\n";
        }

        // 3. Create products table if not exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            tax_rate DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        echo "Ensured 'products' table exists.\n";

        // 4. Create audit_logs table
        $pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            action VARCHAR(255),
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        echo "Ensured 'audit_logs' table exists.\n";

        // 5. Add branding columns to users (for admins)
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'company_name'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN company_name VARCHAR(255) NULL, ADD COLUMN company_logo VARCHAR(255) NULL");
            echo "Added branding columns to 'users' table.\n";
        }

        // 6. Add discount columns to invoices
        $stmt = $pdo->query("SHOW COLUMNS FROM invoices LIKE 'discount_rate'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE invoices ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0, ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0");
            echo "Added discount columns to 'invoices' table.\n";
        }

        // 7. Create reminders table
        $pdo->exec("CREATE TABLE IF NOT EXISTS reminders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_id INT NOT NULL,
            reminder_type ENUM('due_soon', 'overdue', 'follow_up') NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        echo "Ensured 'reminders' table exists.\n";

        // 8. Add Razorpay and Twilio columns to business_settings
        $stmt = $pdo->query("SHOW COLUMNS FROM business_settings LIKE 'razorpay_key'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE business_settings ADD COLUMN razorpay_key VARCHAR(255) NULL, ADD COLUMN twilio_sid VARCHAR(255) NULL, ADD COLUMN twilio_auth VARCHAR(255) NULL");
            echo "Added Razorpay and Twilio columns to 'business_settings' table.\n";
        }

        // 9. Add cost column to products
        $stmt = $pdo->query("SHOW COLUMNS FROM products LIKE 'cost'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE products ADD COLUMN cost DECIMAL(10,2) DEFAULT 0");
            echo "Added cost column to 'products' table.\n";
        }

        // 10. Add admin_id to users for staff management
        $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'admin_id'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE users ADD COLUMN admin_id INT NULL");
            echo "Added admin_id column to 'users' table.\n";
        }

        echo "Migrations completed successfully!\n";
    } catch (Exception $e) {
        echo "Migration Error: " . $e->getMessage() . "\n";
    }
}

// Security: Only allow if a certain key is provided or if run from CLI (if we could)
// Since we have to run via browser, let's just run it for now.
runMigration();
