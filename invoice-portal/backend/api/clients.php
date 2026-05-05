<?php
/**
 * Clients API
 * 
 * GET            → list all clients for logged-in user
 * GET  ?id=X     → single client
 * POST           → create client
 * PUT  ?id=X     → update client
 * DELETE ?id=X   → delete client
 */
// 🔥 ADD THIS BLOCK (CORS + OPTIONS)
session_start();
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/db.php';

$userId = requireAuth();
$role   = getUserRole($userId);

if (!in_array($role, ['admin', 'staff'])) {
    jsonResponse(['error' => 'Forbidden. Admin or Staff access required.'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {
    case 'GET':
        $id ? getClient($id) : getClients();
        break;
    case 'POST':
        createClient();
        break;
    case 'PUT':
        if (!$id) jsonResponse(['error' => 'Client ID required'], 400);
        updateClient($id);
        break;
    case 'DELETE':
        if (!$id) jsonResponse(['error' => 'Client ID required'], 400);
        deleteClient($id);
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

// ─── Handlers ────────────────────────────────

function getClients(): void {
    global $pdo, $userId;
    $stmt = $pdo->prepare(
        "SELECT id, name, email, phone, company, address, created_at
         FROM clients WHERE user_id = ? ORDER BY created_at DESC"
    );
    $stmt->execute([$userId]);
    jsonResponse(['clients' => $stmt->fetchAll()]);
}

function getClient(int $id): void {
    global $pdo, $userId;
    $stmt = $pdo->prepare(
        "SELECT id, name, email, phone, company, address, created_at
         FROM clients WHERE id = ? AND user_id = ?"
    );
    $stmt->execute([$id, $userId]);
    $client = $stmt->fetch();
    if (!$client) jsonResponse(['error' => 'Client not found'], 404);
    jsonResponse(['client' => $client]);
}

function createClient(): void {
    global $pdo, $userId;
    $data = getJsonBody();

    $name    = trim($data['name'] ?? '');
    $email   = trim($data['email'] ?? '');
    $phone   = trim($data['phone'] ?? '');
    $company = trim($data['company'] ?? '');
    $address = trim($data['address'] ?? '');

    if (empty($name)) {
        jsonResponse(['error' => 'Client name is required.'], 422);
    }

    // Check if a client user account already exists with this email
    $clientUserId = null;
    if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND role = 'client'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user) $clientUserId = $user['id'];
    }

    $stmt = $pdo->prepare(
        "INSERT INTO clients (user_id, client_user_id, name, email, phone, company, address)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$userId, $clientUserId, $name, $email, $phone, $company, $address]);

    $clientId = (int) $pdo->lastInsertId();
    jsonResponse([
        'message' => 'Client created successfully.',
        'client'  => [
            'id'      => $clientId,
            'name'    => $name,
            'email'   => $email,
            'phone'   => $phone,
            'company' => $company,
            'address' => $address,
        ]
    ], 201);
}

function updateClient(int $id): void {
    global $pdo, $userId;
    $data = getJsonBody();

    // Verify ownership
    $stmt = $pdo->prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);
    if (!$stmt->fetch()) jsonResponse(['error' => 'Client not found'], 404);

    $name    = trim($data['name'] ?? '');
    $email   = trim($data['email'] ?? '');
    $phone   = trim($data['phone'] ?? '');
    $company = trim($data['company'] ?? '');
    $address = trim($data['address'] ?? '');

    if (empty($name)) {
        jsonResponse(['error' => 'Client name is required.'], 422);
    }

    // Check if a client user account already exists with this email
    $clientUserId = null;
    if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND role = 'client'");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user) $clientUserId = $user['id'];
    }

    $stmt = $pdo->prepare(
        "UPDATE clients SET client_user_id = ?, name = ?, email = ?, phone = ?, company = ?, address = ?
         WHERE id = ? AND user_id = ?"
    );
    $stmt->execute([$clientUserId, $name, $email, $phone, $company, $address, $id, $userId]);

    jsonResponse(['message' => 'Client updated successfully.']);
}

function deleteClient(int $id): void {
    global $pdo, $userId;
    $stmt = $pdo->prepare("DELETE FROM clients WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Client not found'], 404);
    }
    jsonResponse(['message' => 'Client deleted successfully.']);
}
