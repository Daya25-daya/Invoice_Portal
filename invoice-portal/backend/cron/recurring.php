<?php
/**
 * Recurring Invoice Automation Cron Job
 * Should be run daily.
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/templates.php';

// Security check for browser access
$secret = $_GET['secret'] ?? '';
if (PHP_SAPI !== 'cli' && $secret !== 'CRON_SECRET_123') {
    die("Unauthorized");
}

echo "Starting recurring invoice processing...\n";

// 1. Find active recurring invoices due for a new run
$stmt = $pdo->query(
    "SELECT i.*, c.name as client_name, c.email as client_email,
            u.company_name, u.company_logo
     FROM invoices i 
     JOIN clients c ON i.client_id = c.id 
     JOIN users u ON i.user_id = u.id
     WHERE i.is_recurring = 1 
       AND i.next_run_date <= CURDATE()"
);

$recurringInvoices = $stmt->fetchAll();
$createdCount = 0;

foreach ($recurringInvoices as $parent) {
    echo "Processing recurring invoice {$parent['invoice_number']} for client {$parent['client_name']}...\n";

    $pdo->beginTransaction();
    try {
        // Generate new invoice number
        $invNum = generateNextInvoiceNumber($parent['user_id']);
        
        // Calculate new dates
        $issueDate = date('Y-m-d');
        $dueDate = date('Y-m-d', strtotime("+14 days")); // Default 14 days due

        // Create new invoice
        $stmt = $pdo->prepare("INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, discount_rate, discount_amount, total, notes, status) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sent')");
        $stmt->execute([
            $parent['user_id'], $parent['client_id'], $invNum, $issueDate, $dueDate, 
            $parent['subtotal'], $parent['tax_rate'], $parent['tax_amount'], 
            $parent['discount_rate'], $parent['discount_amount'], $parent['total'], 
            $parent['notes']
        ]);
        $newInvId = $pdo->lastInsertId();

        // Clone line items
        $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmt->execute([$parent['id']]);
        $items = $stmt->fetchAll();

        $itemStmt = $pdo->prepare("INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)");
        foreach ($items as $it) {
            $itemStmt->execute([$newInvId, $it['description'], $it['quantity'], $it['unit_price'], $it['amount']]);
        }

        // Calculate next run date based on frequency
        $freq = $parent['recurring_frequency'] ?: 'monthly';
        $nextRun = date('Y-m-d', strtotime($parent['next_run_date'] . " +1 $freq"));

        // Update parent next_run_date
        $pdo->prepare("UPDATE invoices SET next_run_date = ? WHERE id = ?")->execute([$nextRun, $parent['id']]);

        $pdo->commit();
        $createdCount++;

        // Audit Log
        recordAuditLog($parent['user_id'], 'AUTO_RECURRING', "Generated recurring invoice $invNum from {$parent['invoice_number']}");

        // In a real app, send the email here using the templates we built
        echo "Created $invNum. Next run: $nextRun\n";

    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error processing {$parent['invoice_number']}: " . $e->getMessage() . "\n";
    }
}

function generateNextInvoiceNumber($userId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE user_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $last = $stmt->fetch();
    $next = ($last && preg_match('/INV-(\d+)/', $last['invoice_number'], $m)) ? (int)$m[1] + 1 : 1;
    return 'INV-' . str_pad($next, 4, '0', STR_PAD_LEFT);
}

echo "Finished. New invoices created: $createdCount\n";
