<?php
/**
 * Cron Job: Generate Recurring Invoices
 * Run this daily via cron: `php backend/cron/generate_recurring.php`
 */

require_once __DIR__ . '/../config/db.php';

// Prevent web access
if (php_sapi_name() !== 'cli' && !isset($_GET['secret_cron_key'])) {
    die("Access denied.");
}

echo "Starting recurring invoice generation...\n";

// Find all recurring invoices where next_run_date is today or in the past
$stmt = $pdo->query("SELECT * FROM invoices WHERE is_recurring = 1 AND next_run_date IS NOT NULL AND next_run_date <= CURDATE()");
$recurringInvoices = $stmt->fetchAll();

if (!$recurringInvoices) {
    echo "No recurring invoices to process today.\n";
    exit;
}

$processed = 0;

foreach ($recurringInvoices as $parent) {
    $pdo->beginTransaction();
    try {
        // Calculate new dates
        $issueDate = date('Y-m-d');
        // Calculate the due date based on the delta of the original invoice
        $originalIssue = new DateTime($parent['issue_date']);
        $originalDue = new DateTime($parent['due_date']);
        $daysDiff = $originalIssue->diff($originalDue)->days;
        
        $newDue = new DateTime($issueDate);
        $newDue->modify("+$daysDiff days");
        $dueDateStr = $newDue->format('Y-m-d');

        // Generate new invoice number
        $stmtNum = $pdo->prepare("SELECT invoice_number FROM invoices WHERE user_id=? ORDER BY id DESC LIMIT 1");
        $stmtNum->execute([$parent['user_id']]);
        $last = $stmtNum->fetch();
        $next = ($last && preg_match('/INV-(\d+)/', $last['invoice_number'], $m)) ? (int)$m[1]+1 : 1;
        $newInvNum = 'INV-'.str_pad($next, 4, '0', STR_PAD_LEFT);

        // Insert new child invoice
        // We set is_recurring to 0 for the child so it doesn't spawn its own children
        $stmtInsert = $pdo->prepare("INSERT INTO invoices 
            (user_id, client_id, invoice_number, issue_date, due_date, subtotal, tax_rate, tax_amount, total, notes, status, is_recurring) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0)");
        
        $stmtInsert->execute([
            $parent['user_id'], $parent['client_id'], $newInvNum, $issueDate, $dueDateStr,
            $parent['subtotal'], $parent['tax_rate'], $parent['tax_amount'], $parent['total'], $parent['notes']
        ]);
        
        $newInvoiceId = $pdo->lastInsertId();

        // Copy invoice items
        $stmtItems = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
        $stmtItems->execute([$parent['id']]);
        $items = $stmtItems->fetchAll();

        $stmtItemInsert = $pdo->prepare("INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES (?, ?, ?, ?, ?)");
        foreach ($items as $item) {
            $stmtItemInsert->execute([
                $newInvoiceId, $item['description'], $item['quantity'], $item['unit_price'], $item['amount']
            ]);
        }

        // Update the parent's next_run_date
        $nextRunDate = new DateTime($parent['next_run_date']);
        switch ($parent['recurring_frequency']) {
            case 'weekly': $nextRunDate->modify('+1 week'); break;
            case 'monthly': $nextRunDate->modify('+1 month'); break;
            case 'yearly': $nextRunDate->modify('+1 year'); break;
            default: $nextRunDate->modify('+1 month'); break; // Fallback
        }
        
        $stmtUpdateParent = $pdo->prepare("UPDATE invoices SET next_run_date = ? WHERE id = ?");
        $stmtUpdateParent->execute([$nextRunDate->format('Y-m-d'), $parent['id']]);

        $pdo->commit();
        echo "Generated $newInvNum from recurring invoice {$parent['invoice_number']}.\n";
        $processed++;
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error processing invoice ID {$parent['id']}: " . $e->getMessage() . "\n";
    }
}

echo "Finished processing. Generated $processed new invoices.\n";
