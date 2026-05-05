<?php
/**
 * Products / Services API
 * GET: Fetch all products for the logged-in admin
 * POST: Create a new product
 * PUT: Update an existing product
 * DELETE: Delete a product
 */
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
$role = getUserRole($userId);

if ($role !== 'admin') {
    jsonResponse(['error' => 'Unauthorized. Only admins can manage products.'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("SELECT * FROM products WHERE user_id = ? ORDER BY name ASC");
        $stmt->execute([$userId]);
        jsonResponse($stmt->fetchAll());
        break;

    case 'POST':
        $data = getJsonBody();
        if (empty($data['name']) || !isset($data['price'])) {
            jsonResponse(['error' => 'Name and Price are required.'], 400);
        }

        $stmt = $pdo->prepare("INSERT INTO products (user_id, name, description, price, tax_rate, cost) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $data['name'],
            $data['description'] ?? null,
            (float)$data['price'],
            (float)($data['tax_rate'] ?? 0),
            (float)($data['cost'] ?? 0)
        ]);
        
        $data['id'] = $pdo->lastInsertId();
        jsonResponse(['message' => 'Product created', 'product' => $data], 201);
        break;

    case 'PUT':
        $data = getJsonBody();
        $id = $data['id'] ?? null;
        if (!$id || empty($data['name']) || !isset($data['price'])) {
            jsonResponse(['error' => 'ID, Name, and Price are required.'], 400);
        }

        // Verify ownership
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        if (!$stmt->fetch()) jsonResponse(['error' => 'Product not found or unauthorized'], 404);

        $stmt = $pdo->prepare("UPDATE products SET name = ?, description = ?, price = ?, tax_rate = ?, cost = ? WHERE id = ?");
        $stmt->execute([
            $data['name'],
            $data['description'] ?? null,
            (float)$data['price'],
            (float)($data['tax_rate'] ?? 0),
            (float)($data['cost'] ?? 0),
            $id
        ]);
        jsonResponse(['message' => 'Product updated successfully']);
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) jsonResponse(['error' => 'Product ID required'], 400);

        // Verify ownership
        $stmt = $pdo->prepare("SELECT id FROM products WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        if (!$stmt->fetch()) jsonResponse(['error' => 'Product not found or unauthorized'], 404);

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        jsonResponse(['message' => 'Product deleted successfully']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
