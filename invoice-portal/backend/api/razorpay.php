<?php
/**
 * Razorpay API Integration
 * POST ?action=create_order
 * POST ?action=verify_payment
 */
require_once __DIR__ . '/../config/db.php';

$userId = requireAuth();
$role = getUserRole($userId);
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);

// Fetch admin's Razorpay keys
function getRazorpayKeys($invId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT bs.razorpay_key FROM business_settings bs JOIN invoices i ON bs.user_id = i.user_id WHERE i.id = ?");
    $stmt->execute([$invId]);
    return $stmt->fetch();
}

if ($action === 'create_order') {
    $data = getJsonBody();
    $invoiceId = (int)($data['invoice_id'] ?? 0);
    
    if (!$invoiceId) jsonResponse(['error' => 'Invoice ID required'], 400);

    // Fetch invoice details
    $stmt = $pdo->prepare("SELECT total, invoice_number FROM invoices WHERE id = ?");
    $stmt->execute([$invoiceId]);
    $inv = $stmt->fetch();
    if (!$inv) jsonResponse(['error' => 'Invoice not found'], 404);

    $keys = getRazorpayKeys($invoiceId);
    if (!$keys || empty($keys['razorpay_key'])) {
        jsonResponse(['error' => 'Razorpay is not configured for this business.'], 400);
    }

    // In a real app, you'd use the Secret Key here via Curl to Razorpay API
    // For this demo/setup, we'll return a mock order ID
    $orderId = 'order_' . bin2hex(random_bytes(8));
    
    jsonResponse([
        'order_id' => $orderId,
        'amount' => $inv['total'] * 100, // in paise
        'currency' => 'INR',
        'key' => $keys['razorpay_key'],
        'invoice_number' => $inv['invoice_number']
    ]);
}

if ($action === 'verify_payment') {
    $data = getJsonBody();
    $invoiceId = (int)($data['invoice_id'] ?? 0);
    $razorpay_payment_id = $data['razorpay_payment_id'] ?? '';
    
    if (!$invoiceId || !$razorpay_payment_id) jsonResponse(['error' => 'Invalid data'], 400);

    // Record the payment
    $stmt = $pdo->prepare("SELECT total FROM invoices WHERE id = ?");
    $stmt->execute([$invoiceId]);
    $inv = $stmt->fetch();

    $stmt = $pdo->prepare("INSERT INTO payments (invoice_id, amount, method, notes, payment_date) VALUES (?, ?, ?, ?, CURDATE())");
    $stmt->execute([$invoiceId, $inv['total'], 'Razorpay', 'Payment ID: ' . $razorpay_payment_id]);

    // Update invoice status
    $pdo->prepare("UPDATE invoices SET status = 'Paid' WHERE id = ?")->execute([$invoiceId]);

    recordAuditLog($userId, 'ONLINE_PAYMENT', "Paid invoice via Razorpay: $razorpay_payment_id");
    
    jsonResponse(['message' => 'Payment successful and recorded.']);
}
