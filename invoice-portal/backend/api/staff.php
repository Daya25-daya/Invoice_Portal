<?php
/**
 * Staff Management API
 */
require_once __DIR__ . '/../config/db.php';

$userId = requireAuth();
$role   = getUserRole($userId);
$method = $_SERVER['REQUEST_METHOD'];

if ($role !== 'admin') {
    jsonResponse(['error' => 'Only admins can manage staff'], 403);
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE admin_id = ? AND role = 'staff'");
        $stmt->execute([$userId]);
        jsonResponse(['staff' => $stmt->fetchAll()]);
        break;

    case 'POST':
        $data = getJsonBody();
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = password_hash($data['password'] ?? 'Staff123!', PASSWORD_DEFAULT);

        if (empty($name) || empty($email)) jsonResponse(['error' => 'Name and email required'], 400);

        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) jsonResponse(['error' => 'User already exists with this email'], 400);

        $role_to_assign = $data['role'] ?? 'staff';
        if (!in_array($role_to_assign, ['staff', 'client'])) $role_to_assign = 'staff';

        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, admin_id) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $password, $role_to_assign, $userId]);
        
        recordAuditLog($userId, 'ADD_STAFF', "Added staff member: $email");
        jsonResponse(['message' => 'Staff added successfully']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) jsonResponse(['error' => 'ID required'], 400);

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ? AND admin_id = ? AND role = 'staff'");
        $stmt->execute([$id, $userId]);
        
        recordAuditLog($userId, 'REMOVE_STAFF', "Removed staff member ID: $id");
        jsonResponse(['message' => 'Staff removed']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
