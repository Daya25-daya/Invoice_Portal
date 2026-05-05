<?php
/**
 * Stripe Checkout API
 * POST ?action=create_session
 * POST ?action=verify_session
 */
session_start();
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/keys.php';

$userId = requireAuth();
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

if ($action === 'create_session') {
    $data = getJsonBody();
    $invoiceId = (int)($data['invoice_id'] ?? 0);

    if (!$invoiceId) jsonResponse(['error' => 'Invoice ID required'], 400);

    // Get invoice details
    // For clients, ensure they own it. For admins, ensure they own it.
    $role = getUserRole($userId);
    $where = $role === 'admin' ? "i.id = ? AND i.user_id = ?" : "i.id = ? AND c.client_user_id = ?";
    
    $stmt = $pdo->prepare(
        "SELECT i.id, i.invoice_number, i.total, c.email,
                (SELECT COALESCE(SUM(amount),0) FROM payments WHERE invoice_id = i.id) as total_paid
         FROM invoices i JOIN clients c ON i.client_id = c.id WHERE $where"
    );
    $stmt->execute([$invoiceId, $userId]);
    $inv = $stmt->fetch();

    if (!$inv) jsonResponse(['error' => 'Invoice not found'], 404);

    $balance = round((float)$inv['total'] - (float)$inv['total_paid'], 2);
    if ($balance <= 0) {
        jsonResponse(['error' => 'Invoice is already paid in full'], 400);
    }

    // Call Stripe API using cURL
    // Get stripe key from settings of the ADMIN who owns the invoice
    $stmt = $pdo->prepare("SELECT bs.stripe_key FROM business_settings bs JOIN invoices i ON bs.user_id = i.user_id WHERE i.id = ?");
    $stmt->execute([$invoiceId]);
    $settings = $stmt->fetch();
    $stripeKey = $settings ? $settings['stripe_key'] : '';

    if (empty($stripeKey)) {
        jsonResponse(['error' => 'Stripe is not configured for this account. Please contact the administrator.'], 400);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/checkout/sessions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_USERPWD, $stripeKey . ':' . '');
    
    $postFields = http_build_query([
        'payment_method_types' => ['card'],
        'line_items' => [
            [
                'price_data' => [
                    'currency' => 'inr', // or 'usd' depending on preference
                    'product_data' => [
                        'name' => 'Payment for ' . $inv['invoice_number'],
                    ],
                    'unit_amount' => (int)($balance * 100), // in cents/paise
                ],
                'quantity' => 1,
            ]
        ],
        'mode' => 'payment',
        'customer_email' => $inv['email'],
        'success_url' => FRONTEND_URL . '/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=' . $invoiceId,
        'cancel_url' => FRONTEND_URL . '/invoices/' . $invoiceId,
    ]);

    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $stripeData = json_decode($response, true);

    if ($httpCode >= 200 && $httpCode < 300) {
        jsonResponse(['url' => $stripeData['url']]);
    } else {
        jsonResponse(['error' => 'Stripe Error: ' . ($stripeData['error']['message'] ?? 'Unknown error')], 500);
    }
} elseif ($action === 'verify_session') {
    $data = getJsonBody();
    $sessionId = $data['session_id'] ?? '';
    $invoiceId = (int)($data['invoice_id'] ?? 0);

    if (!$sessionId || !$invoiceId) jsonResponse(['error' => 'Missing session or invoice ID'], 400);

    // Verify session with Stripe
    // Get invoice owner to fetch correct stripe key
    $stmt = $pdo->prepare("SELECT user_id FROM invoices WHERE id = ?");
    $stmt->execute([$invoiceId]);
    $ownerId = $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT stripe_key FROM business_settings WHERE user_id = ?");
    $stmt->execute([$ownerId]);
    $settings = $stmt->fetch();
    $stripeKey = $settings ? $settings['stripe_key'] : '';

    if (empty($stripeKey)) {
        jsonResponse(['error' => 'Stripe is not configured for this account.'], 400);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/checkout/sessions/' . $sessionId);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_USERPWD, $stripeKey . ':' . '');
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $stripeData = json_decode($response, true);

    if ($httpCode === 200 && isset($stripeData['payment_status']) && $stripeData['payment_status'] === 'paid') {
        // Amount paid in cents/paise
        $amountTotal = $stripeData['amount_total'] / 100;
        
        // Prevent double processing by checking if this payment method/reference exists
        // A simple way is to check if we already recorded a payment with this session ID in the notes
        $stmt = $pdo->prepare("SELECT id FROM payments WHERE invoice_id = ? AND notes LIKE ?");
        $stmt->execute([$invoiceId, "%$sessionId%"]);
        if ($stmt->fetch()) {
            jsonResponse(['message' => 'Payment already verified']);
        }

        // Get the invoice's admin owner
        $stmt = $pdo->prepare("SELECT user_id FROM invoices WHERE id = ?");
        $stmt->execute([$invoiceId]);
        $ownerId = $stmt->fetchColumn();

        // Insert payment
        $stmt = $pdo->prepare("INSERT INTO payments (invoice_id, user_id, amount, payment_date, method, notes) VALUES (?, ?, ?, CURDATE(), 'Credit Card', ?)");
        $stmt->execute([$invoiceId, $ownerId, $amountTotal, "Stripe Session: $sessionId"]);

        jsonResponse(['message' => 'Payment verified successfully']);
    } else {
        jsonResponse(['error' => 'Payment not successful or verified'], 400);
    }
} else {
    jsonResponse(['error' => 'Invalid action'], 400);
}
