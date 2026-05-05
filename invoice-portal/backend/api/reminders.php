<?php
/**
 * Automated Reminders API
 * POST ?action=send_whatsapp
 */
session_start();
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';

$userId = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = getJsonBody();
$invoiceId = (int)($data['invoice_id'] ?? 0);

if (!$invoiceId) jsonResponse(['error' => 'Invoice ID required'], 400);

// Fetch invoice and client details
$stmt = $pdo->prepare(
    "SELECT i.*, c.name as client_name, c.phone as client_phone, 
            u.company_name, u.name as admin_name
     FROM invoices i 
     JOIN clients c ON i.client_id = c.id 
     JOIN users u ON i.user_id = u.id
     WHERE i.id = ? AND i.user_id = ?"
);
$stmt->execute([$invoiceId, $userId]);
$inv = $stmt->fetch();

if (!$inv) jsonResponse(['error' => 'Invoice not found'], 404);
if (empty($inv['client_phone'])) jsonResponse(['error' => 'Client has no phone number.'], 400);

// Fetch Twilio Settings
$stmt = $pdo->prepare("SELECT twilio_sid, twilio_auth, twilio_from FROM business_settings WHERE user_id = ?");
$stmt->execute([$userId]);
$settings = $stmt->fetch();

if (empty($settings['twilio_sid']) || empty($settings['twilio_auth']) || empty($settings['twilio_from'])) {
    jsonResponse(['error' => 'Twilio is not configured. Please set your SID, Auth Token, and From Number in Settings.'], 400);
}

$sid = $settings['twilio_sid'];
$token = $settings['twilio_auth'];
$from = $settings['twilio_from'];
$to = 'whatsapp:' . preg_replace('/\D/', '', $inv['client_phone']);

$message = "Hello {$inv['client_name']}, this is a reminder for invoice {$inv['invoice_number']} from " . ($inv['company_name'] ?: $inv['admin_name']) . ". Total amount: " . number_format($inv['total'], 2) . ". Please pay by " . $inv['due_date'] . ". View here: " . FRONTEND_URL . "/pay/" . $inv['token'];

// Send via Twilio API
$url = "https://api.twilio.com/2010-04-01/Accounts/$sid/Messages.json";
$postData = [
    'To' => $to,
    'From' => $from,
    'Body' => $message
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, "$sid:$token");
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local XAMPP issues

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    jsonResponse(['error' => 'CURL Error: ' . $curlError], 500);
}

if ($httpCode >= 200 && $httpCode < 300) {
    recordAuditLog($userId, 'SEND_WHATSAPP', "Sent WhatsApp reminder for invoice {$inv['invoice_number']} to {$inv['client_name']}");
    jsonResponse(['message' => 'WhatsApp reminder sent successfully!']);
} else {
    $err = json_decode($response, true);
    $twilioMsg = $err['message'] ?? 'Unknown Twilio error';
    jsonResponse(['error' => "Twilio Error ($httpCode): " . $twilioMsg], 500);
}
