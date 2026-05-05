<?php
/**
 * Database Configuration & Bootstrap
 * - PDO connection to MySQL
 * - CORS headers for React frontend
 * - Session initialization
 */

// ─── Session ─────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ─── CORS ────────────────────────────────────
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ─── Database ────────────────────────────────
$DB_HOST = 'localhost';
$DB_NAME = 'invoice_portal';
$DB_USER = 'root';
$DB_PASS = '';

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// ─── Helpers ─────────────────────────────────

/**
 * Return a JSON response and exit.
 */
function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit();
}

/**
 * Require the user to be logged in. Returns user_id or exits with 401.
 */
function requireAuth(): int {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Unauthorized. Please log in.'], 401);
    }
    return (int) $_SESSION['user_id'];
}

/**
 * Get JSON body from the request.
 */
function getJsonBody(): array {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

/**
 * Get role for a given user ID
 */
function getUserRole(int $userId): string {
    global $pdo;
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    return $user ? $user['role'] : '';
}

/**
 * Record an action in the audit logs
 */
function recordAuditLog(int $userId, string $action, string $details = ''): void {
    global $pdo;
    try {
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $action, $details]);
    } catch (Exception $e) {
        // Silently fail if audit logging fails (optional)
    }
}
