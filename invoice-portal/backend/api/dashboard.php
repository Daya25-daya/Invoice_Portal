<?php
session_start();
/**
 * Dashboard API
 * GET → aggregated analytics for the logged-in user
 */
// 🔥 ADD THIS BLOCK (CORS + OPTIONS)
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$action = $_GET['action'] ?? '';

if ($action === 'audit_logs') {
    $stmt = $pdo->prepare("SELECT id, action, details, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100");
    $stmt->execute([$userId]);
    jsonResponse(['logs' => $stmt->fetchAll()]);
}

// Total revenue (sum of all payments)
$stmt = $pdo->prepare(
    "SELECT COALESCE(SUM(p.amount), 0) AS total_revenue
     FROM payments p
     JOIN invoices i ON p.invoice_id = i.id
     WHERE i.user_id = ?"
);
$stmt->execute([$userId]);
$totalRevenue = (float) $stmt->fetch()['total_revenue'];

// Dynamic pending and overdue calculations
$stmt = $pdo->prepare(
    "SELECT i.total, i.status, i.due_date,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) AS total_paid
     FROM invoices i WHERE i.user_id = ?"
);
$stmt->execute([$userId]);
$allInvoices = $stmt->fetchAll();

$pendingAmount = 0.0;
$overdueAmount = 0.0;
$agingReport = ['0-30' => 0, '31-60' => 0, '61-90' => 0, '90+' => 0];

foreach ($allInvoices as $inv) {
    if ($inv['status'] === 'Draft' || $inv['status'] === 'Cancelled') continue;
    
    $paid = (float) $inv['total_paid'];
    $total = (float) $inv['total'];
    $dueDate = $inv['due_date'];
    
    $balance = max(0, $total - $paid);
    
    if ($balance > 0) {
        if ($dueDate < date('Y-m-d')) {
            $overdueAmount += $balance;
            
            // Aging calculation
            $diff = (strtotime(date('Y-m-d')) - strtotime($dueDate)) / (60 * 60 * 24);
            if ($diff <= 30) $agingReport['0-30'] += $balance;
            elseif ($diff <= 60) $agingReport['31-60'] += $balance;
            elseif ($diff <= 90) $agingReport['61-90'] += $balance;
            else $agingReport['90+'] += $balance;
        } else {
            $pendingAmount += $balance;
        }
    }
}

// Total clients
$stmt = $pdo->prepare("SELECT COUNT(*) AS total_clients FROM clients WHERE user_id = ?");
$stmt->execute([$userId]);
$totalClients = (int) $stmt->fetch()['total_clients'];

// Total invoices
$stmt = $pdo->prepare("SELECT COUNT(*) AS total_invoices FROM invoices WHERE user_id = ?");
$stmt->execute([$userId]);
$totalInvoices = (int) $stmt->fetch()['total_invoices'];

// 5 most recent invoices with dynamic status
function getDynamicStatus($status, $total, $paid, $dueDate) {
    if ($status === 'Draft' || $status === 'Cancelled') return $status;
    if ($paid >= $total && $total > 0) return 'Paid';
    if ($paid > 0 && $paid < $total && $dueDate >= date('Y-m-d')) return 'Partial';
    if ($paid < $total && $dueDate < date('Y-m-d')) return 'Overdue';
    return 'Pending';
}

$stmt = $pdo->prepare(
    "SELECT i.id, i.invoice_number, i.status, i.total, i.due_date, c.name AS client_name,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) AS total_paid
     FROM invoices i JOIN clients c ON i.client_id = c.id
     WHERE i.user_id = ? ORDER BY i.created_at DESC LIMIT 5"
);
$stmt->execute([$userId]);
$stats['recent_invoices'] = $stmt->fetchAll();

// Fetch Recent Payments for Admin
$stmt = $pdo->query("SELECT p.id, p.amount, p.payment_date, p.method, i.invoice_number, c.name as client_name 
                     FROM payments p 
                     JOIN invoices i ON p.invoice_id = i.id 
                     JOIN clients c ON i.client_id = c.id 
                     ORDER BY p.payment_date DESC LIMIT 5");
$stats['recent_payments'] = $stmt->fetchAll();

// Fetch Transaction Stats (Last 6 Months Revenue for Graph)
$stmt = $pdo->query("SELECT DATE_FORMAT(payment_date, '%b %Y') as month, SUM(amount) as total 
                     FROM payments 
                     WHERE payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                     GROUP BY month ORDER BY payment_date ASC");
$stats['revenue_trend'] = $stmt->fetchAll();

$recentResult = [];
foreach ($stats['recent_invoices'] as $inv) {
    $inv['status'] = getDynamicStatus($inv['status'], (float)$inv['total'], (float)$inv['total_paid'], $inv['due_date']);
    $recentResult[] = $inv;
}

// Total transaction count
$stmt = $pdo->prepare("SELECT COUNT(*) as count FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.user_id = ?");
$stmt->execute([$userId]);
$totalTransactions = (int) $stmt->fetch()['count'];

// Status distribution for Pie Chart
$statusCounts = ['Paid' => 0, 'Pending' => 0, 'Overdue' => 0, 'Draft' => 0];
foreach ($allInvoices as $inv) {
    $dynStatus = getDynamicStatus($inv['status'], (float)$inv['total'], (float)$inv['total_paid'], $inv['due_date']);
    if (isset($statusCounts[$dynStatus])) {
        $statusCounts[$dynStatus]++;
    }
}

// Advanced Analytics: LTV and Profitability
$ltv = $totalClients > 0 ? ($totalRevenue / $totalClients) : 0;

// Estimated Cost (Sum of items * product cost)
// We join with products to get the current cost (or we could have stored cost in invoice_items at time of creation for better accuracy)
$stmt = $pdo->prepare(
    "SELECT SUM(ii.quantity * COALESCE(p.cost, 0)) as total_cost
     FROM invoice_items ii
     JOIN invoices i ON ii.invoice_id = i.id
     LEFT JOIN products p ON ii.description = p.name AND p.user_id = i.user_id
     WHERE i.user_id = ? AND i.status = 'Paid'"
);
$stmt->execute([$userId]);
$estimatedCost = (float) $stmt->fetch()['total_cost'];
$netProfit = $totalRevenue - $estimatedCost;
$profitMargin = $totalRevenue > 0 ? (($netProfit / $totalRevenue) * 100) : 0;

// Top Clients by Revenue
$stmt = $pdo->prepare(
    "SELECT c.name, SUM(p.amount) as total_spent
     FROM clients c
     JOIN invoices i ON c.id = i.client_id
     JOIN payments p ON i.id = p.invoice_id
     WHERE i.user_id = ?
     GROUP BY c.id ORDER BY total_spent DESC LIMIT 5"
);
$stmt->execute([$userId]);
$topClients = $stmt->fetchAll();

jsonResponse([
    'total_revenue'   => $totalRevenue,
    'pending_amount'  => $pendingAmount,
    'overdue_amount'  => $overdueAmount,
    'total_clients'   => $totalClients,
    'total_invoices'  => $totalInvoices,
    'total_transactions' => $totalTransactions,
    'recent_invoices' => $recentResult,
    'recent_payments' => $stats['recent_payments'] ?? [],
    'revenue_trend'   => $stats['revenue_trend'] ?? [],
    'status_counts'   => $statusCounts,
    'aging_report'    => $agingReport,
    'top_clients'     => $topClients,
    'ltv'             => $ltv,
    'estimated_cost'  => $estimatedCost,
    'net_profit'      => $netProfit,
    'profit_margin'   => $profitMargin
]);
