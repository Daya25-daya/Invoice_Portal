<?php
/**
 * Automated Reminders Cron Job
 * Should be run daily.
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/keys.php';
require_once __DIR__ . '/../config/templates.php';

// Security check for browser access
$secret = $_GET['secret'] ?? '';
if (PHP_SAPI !== 'cli' && $secret !== 'CRON_SECRET_123') {
    die("Unauthorized");
}

echo "Starting automated reminders...\n";

// 1. Find invoices due today or overdue
$stmt = $pdo->query(
    "SELECT i.id, i.invoice_number, i.due_date, i.total, i.user_id,
            c.name as client_name, c.email as client_email,
            u.company_name, u.company_logo,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid
     FROM invoices i 
     JOIN clients c ON i.client_id = c.id 
     JOIN users u ON i.user_id = u.id
     WHERE i.status NOT IN ('Paid', 'Cancelled', 'Draft')
       AND (i.due_date <= CURDATE())"
);

$invoices = $stmt->fetchAll();
$sentCount = 0;

foreach ($invoices as $inv) {
    $balance = (float)$inv['total'] - (float)$inv['total_paid'];
    if ($balance <= 0) continue;

    $type = ($inv['due_date'] == date('Y-m-d')) ? 'due_soon' : 'overdue';

    // Prevent duplicate reminders for the same type within 7 days
    $check = $pdo->prepare("SELECT id FROM reminders WHERE invoice_id = ? AND reminder_type = ? AND sent_at > DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $check->execute([$inv['id'], $type]);
    if ($check->fetch()) continue;

    // Generate beautiful email
    $templateData = [
        'client_name' => $inv['client_name'],
        'invoice_number' => $inv['invoice_number'],
        'balance' => $balance,
        'due_date' => $inv['due_date'],
        'company_name' => $inv['company_name'] ?: 'InvoiceFlow',
        'company_logo' => $inv['company_logo'],
        'login_url' => FRONTEND_URL . "/login"
    ];
    $htmlMessage = getEmailTemplate('overdue_reminder', $templateData);
    $subject = "Reminder: Invoice {$inv['invoice_number']} is $type";

    echo "Sending $type reminder for {$inv['invoice_number']} to {$inv['client_email']}...\n";
    // @mail($inv['client_email'], $subject, $htmlMessage, $headers); // Simulated

    // Record the reminder
    $pdo->prepare("INSERT INTO reminders (invoice_id, reminder_type) VALUES (?, ?)")->execute([$inv['id'], $type]);
    
    // Audit log
    recordAuditLog($inv['user_id'], 'AUTO_REMINDER', "Sent $type reminder for {$inv['invoice_number']}");

    $sentCount++;
}

echo "Finished. Reminders sent: $sentCount\n";
