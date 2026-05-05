<?php
/**
 * Public Invoice API
 * GET ?token=xyz
 */
session_start();
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';

$token = $_GET['token'] ?? '';
if (!$token) {
    jsonResponse(['error' => 'Invalid or missing token'], 400);
}

// Fetch invoice by token
$stmt = $pdo->prepare(
    "SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_address, c.company as client_company,
            u.company_name as admin_company, u.name as admin_name, u.company_logo as admin_logo,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     JOIN users u ON i.user_id = u.id
     WHERE i.token = ?"
);
$stmt->execute([$token]);
$inv = $stmt->fetch();

if (!$inv) {
    jsonResponse(['error' => 'Invoice not found or link is invalid.'], 404);
}

// Fetch items
$stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
$stmt->execute([$inv['id']]);
$inv['items'] = $stmt->fetchAll();

// Check if Razorpay is enabled for this admin
$stmt = $pdo->prepare("SELECT razorpay_key, stripe_key FROM business_settings WHERE user_id = ?");
$stmt->execute([$inv['user_id']]);
$settings = $stmt->fetch();

$inv['has_razorpay'] = !empty($settings['razorpay_key']);
$inv['has_stripe'] = !empty($settings['stripe_key']);

// We don't return the raw keys, just whether they are enabled.
jsonResponse(['invoice' => $inv]);
