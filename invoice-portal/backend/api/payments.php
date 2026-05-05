<?php
/**
 * Payments API
 * GET  ?invoice_id=X  → list payments for an invoice
 * POST                → record a new payment
 */
require_once __DIR__ . '/../config/db.php';

$userId = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':  getPayments(); break;
    case 'POST': createPayment(); break;
    default:     jsonResponse(['error' => 'Method not allowed'], 405);
}

function getPayments(): void {
    global $pdo, $userId;
    $invoiceId = (int)($_GET['invoice_id'] ?? 0);
    if ($invoiceId <= 0) jsonResponse(['error' => 'invoice_id is required'], 400);

    // Verify ownership
    global $role;
    if ($role === 'admin') {
        $stmt = $pdo->prepare("SELECT id FROM invoices WHERE id = ? AND user_id = ?");
        $stmt->execute([$invoiceId, $userId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT i.id FROM invoices i 
            JOIN clients c ON i.client_id = c.id 
            WHERE i.id = ? AND c.client_user_id = ?
        ");
        $stmt->execute([$invoiceId, $userId]);
    }
    if (!$stmt->fetch()) jsonResponse(['error' => 'Invoice not found or unauthorized.'], 404);

    $stmt = $pdo->prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC");
    $stmt->execute([$invoiceId]);
    jsonResponse(['payments' => $stmt->fetchAll()]);
}

function createPayment(): void {
    global $pdo, $userId;
    $data = getJsonBody();

    $invoiceId   = (int)($data['invoice_id'] ?? 0);
    $amount      = (float)($data['amount'] ?? 0);
    $paymentDate = $data['payment_date'] ?? date('Y-m-d');
    $method      = $data['method'] ?? 'Other';
    $notes       = trim($data['notes'] ?? '');

    if ($invoiceId <= 0) jsonResponse(['error' => 'invoice_id is required.'], 422);
    if ($amount <= 0)    jsonResponse(['error' => 'Amount must be positive.'], 422);

    // Verify ownership and get invoice total
    global $role;
    if ($role === 'admin') {
        $stmt = $pdo->prepare("SELECT id, total, status FROM invoices WHERE id = ? AND user_id = ?");
        $stmt->execute([$invoiceId, $userId]);
    } else {
        $stmt = $pdo->prepare("
            SELECT i.id, i.total, i.status 
            FROM invoices i 
            JOIN clients c ON i.client_id = c.id 
            WHERE i.id = ? AND c.client_user_id = ?
        ");
        $stmt->execute([$invoiceId, $userId]);
    }
    
    $invoice = $stmt->fetch();
    if (!$invoice) jsonResponse(['error' => 'Invoice not found or unauthorized.'], 404);

    // Insert payment
    $stmt = $pdo->prepare(
        "INSERT INTO payments (invoice_id, user_id, amount, payment_date, method, notes)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$invoiceId, $userId, $amount, $paymentDate, $method, $notes]);
    $paymentId = (int) $pdo->lastInsertId();

    // Check if fully paid
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = ?");
    $stmt->execute([$invoiceId]);
    $totalPaid = (float) $stmt->fetch()['total_paid'];

    if ($totalPaid >= (float) $invoice['total']) {
        $pdo->prepare("UPDATE invoices SET status = 'Paid' WHERE id = ?")->execute([$invoiceId]);
    }

    recordAuditLog($userId, 'RECORD_PAYMENT', "Recorded payment of $amount for invoice ID $invoiceId");
    jsonResponse([
        'message'    => 'Payment recorded.',
        'payment_id' => $paymentId,
        'total_paid' => $totalPaid,
        'invoice_total' => (float) $invoice['total'],
        'fully_paid' => $totalPaid >= (float) $invoice['total'],
    ], 201);
}
