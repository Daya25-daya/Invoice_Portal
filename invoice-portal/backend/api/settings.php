<?php
require_once __DIR__ . '/../config/db.php';

$userId = requireAuth();
$role   = getUserRole($userId);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // If client, we might want to show the admin's payment settings
    // For now, let's assume we want the settings of the admin who owns this client
    // For simplicity in this SaaS, we'll fetch the first admin's settings or the specific user's settings
    
    $targetId = $userId;
    if ($role === 'client') {
        // Find the admin who created this client
        $stmt = $pdo->prepare("SELECT user_id FROM clients WHERE client_user_id = ?");
        $stmt->execute([$userId]);
        $owner = $stmt->fetch();
        if ($owner) {
            $targetId = $owner['user_id'];
        }
    }

    $stmt = $pdo->prepare("SELECT bank_name, account_number, ifsc, upi_id, stripe_key, razorpay_key, twilio_sid, twilio_from, smtp_email, smtp_password FROM business_settings WHERE user_id = ?");
    $stmt->execute([$targetId]);
    $settings = $stmt->fetch();

    if (!$settings) {
        $settings = [
            'bank_name' => 'Not Set',
            'account_number' => 'Not Set',
            'ifsc' => 'Not Set',
            'upi_id' => 'Not Set',
            'stripe_key' => '',
            'razorpay_key' => '',
            'twilio_sid' => '',
            'twilio_from' => '',
            'smtp_email' => '',
            'smtp_password' => ''
        ];
    }

    jsonResponse(['settings' => $settings]);
}

if ($method === 'POST') {
    $action = $_GET['action'] ?? '';

    if ($action === 'profile') {
        $data = getJsonBody();
        $name = $data['name'] ?? '';
        $company_name = $data['company_name'] ?? '';
        $company_logo = $data['company_logo'] ?? '';

        $stmt = $pdo->prepare("UPDATE users SET name = ?, company_name = ?, company_logo = ? WHERE id = ?");
        $stmt->execute([$name, $company_name, $company_logo, $userId]);
        
        recordAuditLog($userId, 'UPDATE_PROFILE', "Updated profile/branding");
        jsonResponse(['message' => 'Profile updated successfully']);
    }

    if ($role !== 'admin') {
        jsonResponse(['error' => 'Only admins can update business settings'], 403);
    }
    // ... existing business settings logic

    $data = getJsonBody();
    $bank_name = $data['bank_name'] ?? '';
    $account_number = $data['account_number'] ?? '';
    $ifsc = $data['ifsc'] ?? '';
    $upi_id = $data['upi_id'] ?? '';
    
    $stripe_key = $data['stripe_key'] ?? '';
    $razorpay_key = $data['razorpay_key'] ?? '';
    $twilio_sid = $data['twilio_sid'] ?? '';
    $twilio_auth = $data['twilio_auth'] ?? '';
    $twilio_from = $data['twilio_from'] ?? '';
    $smtp_email = $data['smtp_email'] ?? '';
    $smtp_password = $data['smtp_password'] ?? '';
    
    $stmt = $pdo->prepare("INSERT INTO business_settings (user_id, bank_name, account_number, ifsc, upi_id, stripe_key, razorpay_key, twilio_sid, twilio_auth, twilio_from, smtp_email, smtp_password) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                           ON DUPLICATE KEY UPDATE 
                           bank_name = VALUES(bank_name), 
                           account_number = VALUES(account_number), 
                           ifsc = VALUES(ifsc), 
                           upi_id = VALUES(upi_id),
                           stripe_key = VALUES(stripe_key),
                           razorpay_key = VALUES(razorpay_key),
                           twilio_sid = VALUES(twilio_sid),
                           twilio_auth = VALUES(twilio_auth),
                           twilio_from = VALUES(twilio_from),
                           smtp_email = VALUES(smtp_email),
                           smtp_password = VALUES(smtp_password)");
    $stmt->execute([$userId, $bank_name, $account_number, $ifsc, $upi_id, $stripe_key, $razorpay_key, $twilio_sid, $twilio_auth, $twilio_from, $smtp_email, $smtp_password]);

    jsonResponse(['message' => 'Settings updated successfully']);
}
