<?php
/**
 * Automated Cron Reminders
 * Visit this URL to trigger reminders manually or set up a daily cron job.
 */
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/keys.php';
require_once __DIR__ . '/../config/templates.php';

// Load PHPMailer
require_once __DIR__ . '/../vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/PHPMailer/SMTP.php';
require_once __DIR__ . '/../vendor/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Set time limit to avoid timeout for large batches
set_time_limit(300);

$today = date('Y-m-d');
$threeDaysFromNow = date('Y-m-d', strtotime('+3 days'));

// 1. Fetch all Unpaid/Overdue invoices that need reminders
// We'll remind if it's due in exactly 3 days, or if it's overdue by 1, 3, or 7 days.
$stmt = $pdo->prepare(
    "SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone,
            u.company_name, u.name as admin_name, u.company_logo as admin_logo,
            s.smtp_email, s.smtp_password, s.twilio_sid, s.twilio_auth, s.twilio_from
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     JOIN users u ON i.user_id = u.id
     LEFT JOIN business_settings s ON i.user_id = s.user_id
     WHERE i.status NOT IN ('Paid', 'Cancelled')
     AND (i.due_date = ? OR i.due_date < ?)"
);
$stmt->execute([$threeDaysFromNow, $today]);
$invoices = $stmt->fetchAll();

$processed = 0;
$errors = [];

foreach ($invoices as $inv) {
    $processed++;
    $userId = $inv['user_id'];
    $isOverdue = ($inv['due_date'] < $today);
    $type = $isOverdue ? "Overdue Reminder" : "Upcoming Payment Reminder";
    
    // ─── 1. Send Email ─────────────────────────────
    if (!empty($inv['client_email']) && !empty($inv['smtp_email']) && !empty($inv['smtp_password'])) {
        try {
            $templateData = [
                'client_name' => $inv['client_name'],
                'invoice_number' => $inv['invoice_number'],
                'total' => (float)$inv['total'],
                'balance' => (float)$inv['total'], // Simplified
                'due_date' => $inv['due_date'],
                'company_name' => $inv['company_name'] ?: $inv['admin_name'],
                'company_logo' => $inv['admin_logo'],
                'login_url' => FRONTEND_URL . "/pay/" . $inv['token']
            ];

            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = trim($inv['smtp_email']);
            $mail->Password   = trim($inv['smtp_password']);
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = 465;
            $mail->SMTPOptions = ['ssl'=>['verify_peer'=>false,'verify_peer_name'=>false,'allow_self_signed'=>true]];

            $mail->setFrom($inv['smtp_email'], $inv['company_name'] ?: $inv['admin_name']);
            $mail->addAddress($inv['client_email']);
            $mail->isHTML(true);
            $mail->Subject = "REMINDER: Invoice {$inv['invoice_number']} from " . ($inv['company_name'] ?: $inv['admin_name']);
            $mail->Body    = getEmailTemplate('new_invoice', $templateData); // Reusing template
            
            $mail->send();
        } catch (Exception $e) {
            $errors[] = "Email failed for {$inv['invoice_number']}: " . $mail->ErrorInfo;
        }
    }

    // ─── 2. Send WhatsApp (Twilio) ──────────────────
    if (!empty($inv['client_phone']) && !empty($inv['twilio_sid']) && !empty($inv['twilio_auth']) && !empty($inv['twilio_from'])) {
        $to = 'whatsapp:' . preg_replace('/\D/', '', $inv['client_phone']);
        $message = "REMINDER: Hello {$inv['client_name']}, your invoice {$inv['invoice_number']} for " . number_format($inv['total'], 2) . " is " . ($isOverdue ? "OVERDUE" : "due on " . $inv['due_date']) . ". View and pay here: " . FRONTEND_URL . "/pay/" . $inv['token'];

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$inv['twilio_sid']}/Messages.json";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['To'=>$to, 'From'=>$inv['twilio_from'], 'Body'=>$message]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, "{$inv['twilio_sid']}:{$inv['twilio_auth']}");
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        curl_close($ch);
    }
}

echo json_encode([
    'status' => 'success',
    'date' => $today,
    'invoices_scanned' => count($invoices),
    'reminders_sent' => $processed,
    'errors' => $errors
]);
