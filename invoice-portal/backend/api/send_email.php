<?php
/**
 * Email API
 * POST ?action=send_invoice
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
require_once __DIR__ . '/../config/templates.php';

$userId = requireAuth();
$role = getUserRole($userId);

if ($role !== 'admin') {
    jsonResponse(['error' => 'Only admins can send emails.'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = getJsonBody();
$invoiceId = (int)($data['invoice_id'] ?? 0);

if (!$invoiceId) jsonResponse(['error' => 'Invoice ID required'], 400);

// Fetch invoice details
$stmt = $pdo->prepare(
    "SELECT i.*, c.name as client_name, c.email as client_email,
            u.company_name, u.company_logo,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) as total_paid
     FROM invoices i 
     JOIN clients c ON i.client_id = c.id 
     JOIN users u ON i.user_id = u.id
     WHERE i.id = ? AND i.user_id = ?"
);
$stmt->execute([$invoiceId, $userId]);
$inv = $stmt->fetch();

if (!$inv) jsonResponse(['error' => 'Invoice not found'], 404);
if (empty($inv['client_email'])) jsonResponse(['error' => 'Client has no email address associated.'], 400);

$balance = round((float)$inv['total'] - (float)$inv['total_paid'], 2);
$amountStr = number_format((float)$inv['total'], 2);
$balanceStr = number_format($balance, 2);

// Generate Email Content
$templateData = [
    'client_name' => $inv['client_name'],
    'invoice_number' => $inv['invoice_number'],
    'total' => (float)$inv['total'],
    'balance' => $balance,
    'due_date' => $inv['due_date'],
    'company_name' => $inv['company_name'] ?: 'InvoiceFlow',
    'company_logo' => $inv['company_logo'],
    'login_url' => FRONTEND_URL . "/login"
];

$subject = "Invoice {$inv['invoice_number']} from " . ($inv['company_name'] ?: FROM_NAME);
$htmlMessage = getEmailTemplate('new_invoice', $templateData);

// Load PHPMailer
require_once __DIR__ . '/../vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/PHPMailer/SMTP.php';
require_once __DIR__ . '/../vendor/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Fetch SMTP settings
$stmt = $pdo->prepare("SELECT smtp_email, smtp_password FROM business_settings WHERE user_id = ?");
$stmt->execute([$userId]);
$settings = $stmt->fetch();

$smtpEmail = !empty($settings['smtp_email']) ? $settings['smtp_email'] : (defined('SMTP_USER') ? SMTP_USER : '');
$smtpPass  = !empty($settings['smtp_password']) ? $settings['smtp_password'] : (defined('SMTP_PASS') ? SMTP_PASS : '');

if (empty($smtpEmail) || empty($smtpPass)) {
    jsonResponse(['error' => 'SMTP is not configured. Please set your email and app password in Settings.'], 400);
}

$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com'; 
    $mail->SMTPAuth   = true;
    $mail->Username   = trim($smtpEmail);
    $mail->Password   = trim($smtpPass);
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; 
    $mail->Port       = 465;

    // Fix for SSL certificate issues on local XAMPP
    $mail->SMTPOptions = array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        )
    );

    // Recipients
    $mail->setFrom($smtpEmail, $inv['company_name'] ?: FROM_NAME);
    $mail->addAddress($inv['client_email'], $inv['client_name']);
    $mail->addReplyTo($smtpEmail);

    // Content
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $htmlMessage;

    $mail->send();
    jsonResponse(['message' => 'Invoice sent successfully to ' . $inv['client_email']]);
} catch (Exception $e) {
    jsonResponse(['error' => "Message could not be sent. Mailer Error: {$mail->ErrorInfo}"], 500);
}
