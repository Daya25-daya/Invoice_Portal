<?php
/**
 * Invoices API
 * GET, POST, PUT, DELETE for invoices + line items
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
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;
$action = $_GET['action'] ?? '';

// Clients can only GET
if ($role === 'client' && $method !== 'GET') {
    jsonResponse(['error' => 'Forbidden. Admin or Staff access required.'], 403);
}

// Staff cannot DELETE (enterprise rule example)
if ($role === 'staff' && $method === 'DELETE') {
    jsonResponse(['error' => 'Forbidden. Only admins can delete invoices.'], 403);
}

switch ($method) {
    case 'GET':    $id ? getInvoice($id) : getInvoices(); break;
    case 'POST':   createInvoice(); break;
    case 'PUT':
        if (!$id) jsonResponse(['error' => 'Invoice ID required'], 400);
        $action === 'status' ? updateStatus($id) : updateInvoice($id);
        break;
    case 'DELETE':
        if (!$id) jsonResponse(['error' => 'Invoice ID required'], 400);
        deleteInvoice($id);
        break;
    default: jsonResponse(['error' => 'Method not allowed'], 405);
}

function getDynamicStatus($status, $total, $paid, $dueDate) {
    if ($status === 'Draft' || $status === 'Cancelled') return $status;
    if ($paid >= $total && $total > 0) return 'Paid';
    if ($paid > 0 && $paid < $total && $dueDate >= date('Y-m-d')) return 'Partial';
    if ($paid < $total && $dueDate < date('Y-m-d')) return 'Overdue';
    return 'Pending';
}

function getInvoices(): void {
    global $pdo, $userId, $role;
    $status = $_GET['status'] ?? '';

    $where = $role === 'admin' ? "i.user_id = ?" : "c.client_user_id = ?";

    $sql = "SELECT i.id, i.invoice_number, i.status, i.issue_date, i.due_date,
                   i.total, i.created_at, c.name AS client_name, c.email AS client_email,
                   (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = i.id) AS total_paid
            FROM invoices i JOIN clients c ON i.client_id = c.id WHERE $where";
    $params = [$userId];

    $sql .= " ORDER BY i.created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $invoices = $stmt->fetchAll();
    $result = [];
    foreach ($invoices as $inv) {
        $dynStatus = getDynamicStatus($inv['status'], (float)$inv['total'], (float)$inv['total_paid'], $inv['due_date']);
        if (empty($status) || $dynStatus === $status) {
            $inv['status'] = $dynStatus;
            $result[] = $inv;
        }
    }

    jsonResponse(['invoices' => $result]);
}

function getInvoice(int $id): void {
    global $pdo, $userId, $role;

    $where = $role === 'admin' ? "i.id = ? AND i.user_id = ?" : "i.id = ? AND c.client_user_id = ?";

    $stmt = $pdo->prepare(
        "SELECT i.*, c.name AS client_name, c.email AS client_email,
                c.phone AS client_phone, c.company AS client_company, c.address AS client_address,
                u.name AS admin_name, u.company_name AS admin_company, u.company_logo AS admin_logo
         FROM invoices i 
         JOIN clients c ON i.client_id = c.id 
         JOIN users u ON i.user_id = u.id
         WHERE $where"
    );
    $stmt->execute([$id, $userId]);
    $inv = $stmt->fetch();
    if (!$inv) jsonResponse(['error' => 'Invoice not found'], 404);

    $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
    $stmt->execute([$id]);
    $inv['items'] = $stmt->fetchAll();

    $stmt = $pdo->prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC");
    $stmt->execute([$id]);
    $inv['payments'] = $stmt->fetchAll();

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount),0) AS total_paid FROM payments WHERE invoice_id = ?");
    $stmt->execute([$id]);
    $inv['total_paid'] = (float) $stmt->fetch()['total_paid'];

    $inv['status'] = getDynamicStatus($inv['status'], (float)$inv['total'], $inv['total_paid'], $inv['due_date']);

    jsonResponse(['invoice' => $inv]);
}

function createInvoice(): void {
    global $pdo, $userId;
    $data = getJsonBody();
    $clientId  = (int)($data['client_id'] ?? 0);
    $issueDate = $data['issue_date'] ?? date('Y-m-d');
    $dueDate   = $data['due_date'] ?? '';
    $taxRate   = (float)($data['tax_rate'] ?? 0);
    $notes     = trim($data['notes'] ?? '');
    $isRecurring = !empty($data['is_recurring']) ? 1 : 0;
    $recurringFrequency = $isRecurring ? ($data['recurring_frequency'] ?? 'monthly') : null;
    $nextRunDate = $isRecurring ? ($data['next_run_date'] ?? $issueDate) : null;
    $items     = $data['items'] ?? [];

    if ($clientId <= 0) jsonResponse(['error' => 'Client is required.'], 422);
    if (empty($dueDate)) jsonResponse(['error' => 'Due date is required.'], 422);
    if (empty($items))   jsonResponse(['error' => 'At least one line item is required.'], 422);

    $stmt = $pdo->prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?");
    $stmt->execute([$clientId, $userId]);
    if (!$stmt->fetch()) jsonResponse(['error' => 'Client not found.'], 404);

    $invNum = generateInvoiceNumber();
    $subtotal = 0;
    foreach ($items as &$it) {
        $it['amount'] = round((float)($it['quantity']??1) * (float)($it['unit_price']??0), 2);
        $subtotal += $it['amount'];
    }
    unset($it);

    $discountRate = (float)($data['discount_rate'] ?? 0);
    $discountAmount = round($subtotal * ($discountRate / 100), 2);
    $taxableAmount = $subtotal - $discountAmount;
    
    $taxAmount = round($taxableAmount * ($taxRate / 100), 2);
    $total = round($taxableAmount + $taxAmount, 2);
    $token = bin2hex(random_bytes(16));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO invoices (user_id,client_id,invoice_number,issue_date,due_date,subtotal,tax_rate,tax_amount,discount_rate,discount_amount,total,notes,is_recurring,recurring_frequency,next_run_date,token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([$userId,$clientId,$invNum,$issueDate,$dueDate,$subtotal,$taxRate,$taxAmount,$discountRate,$discountAmount,$total,$notes,$isRecurring,$recurringFrequency,$nextRunDate,$token]);
        $invId = (int)$pdo->lastInsertId();

        $stmt = $pdo->prepare("INSERT INTO invoice_items (invoice_id,description,quantity,unit_price,amount) VALUES (?,?,?,?,?)");
        foreach ($items as $it) {
            $stmt->execute([$invId, trim($it['description']??'Item'), (float)($it['quantity']??1), (float)($it['unit_price']??0), (float)($it['amount']??0)]);
        }
        $pdo->commit();
        recordAuditLog($userId, 'CREATE_INVOICE', "Created invoice $invNum for client ID $clientId");
        jsonResponse(['message'=>'Invoice created.','invoice_id'=>$invId,'invoice_number'=>$invNum], 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error'=>'Failed: '.$e->getMessage()], 500);
    }
}

function updateInvoice(int $id): void {
    global $pdo, $userId;
    $stmt = $pdo->prepare("SELECT id,status FROM invoices WHERE id=? AND user_id=?");
    $stmt->execute([$id,$userId]);
    $inv = $stmt->fetch();
    if (!$inv) jsonResponse(['error'=>'Invoice not found'],404);

    $data = getJsonBody();
    $clientId=(int)($data['client_id']??0); $issueDate=$data['issue_date']??''; $dueDate=$data['due_date']??'';
    $taxRate=(float)($data['tax_rate']??0); $notes=trim($data['notes']??''); $status=$data['status']??$inv['status'];
    $isRecurring = !empty($data['is_recurring']) ? 1 : 0;
    $recurringFrequency = $isRecurring ? ($data['recurring_frequency'] ?? 'monthly') : null;
    $nextRunDate = $isRecurring ? ($data['next_run_date'] ?? $issueDate) : null;
    $items=$data['items']??[];
    if ($clientId<=0) jsonResponse(['error'=>'Client is required.'],422);

    $subtotal=0;
    foreach ($items as &$it) { $it['amount']=round((float)($it['quantity']??1)*(float)($it['unit_price']??0),2); $subtotal+=$it['amount']; }
    unset($it);
    $discountRate=(float)($data['discount_rate']??0);
    $discountAmount=round($subtotal*($discountRate/100),2);
    $taxableAmount=$subtotal-$discountAmount;
    $taxAmount=round($taxableAmount*($taxRate/100),2); $total=round($taxableAmount+$taxAmount,2);

    $pdo->beginTransaction();
    try {
        $pdo->prepare("UPDATE invoices SET client_id=?,issue_date=?,due_date=?,subtotal=?,tax_rate=?,tax_amount=?,discount_rate=?,discount_amount=?,total=?,notes=?,status=?,is_recurring=?,recurring_frequency=?,next_run_date=? WHERE id=? AND user_id=?")
            ->execute([$clientId,$issueDate,$dueDate,$subtotal,$taxRate,$taxAmount,$discountRate,$discountAmount,$total,$notes,$status,$isRecurring,$recurringFrequency,$nextRunDate,$id,$userId]);
        $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id=?")->execute([$id]);
        $stmt=$pdo->prepare("INSERT INTO invoice_items (invoice_id,description,quantity,unit_price,amount) VALUES (?,?,?,?,?)");
        foreach ($items as $it) { $stmt->execute([$id,trim($it['description']??'Item'),(float)($it['quantity']??1),(float)($it['unit_price']??0),(float)($it['amount']??0)]); }
        $pdo->commit();
        recordAuditLog($userId, 'UPDATE_INVOICE', "Updated invoice ID $id");
        jsonResponse(['message'=>'Invoice updated.']);
    } catch (Exception $e) { $pdo->rollBack(); jsonResponse(['error'=>'Failed: '.$e->getMessage()],500); }
}

function updateStatus(int $id): void {
    global $pdo, $userId;
    $data = getJsonBody();
    $status = $data['status'] ?? '';
    if (!in_array($status, ['Draft','Sent','Paid','Overdue','Cancelled','Pending','Partial'])) jsonResponse(['error'=>'Invalid status.'],422);
    $stmt=$pdo->prepare("UPDATE invoices SET status=? WHERE id=? AND user_id=?");
    $stmt->execute([$status,$id,$userId]);
    if ($stmt->rowCount()===0) jsonResponse(['error'=>'Invoice not found'],404);
    recordAuditLog($userId, 'UPDATE_STATUS', "Updated invoice ID $id status to $status");
    jsonResponse(['message'=>'Status updated.']);
}

function deleteInvoice(int $id): void {
    global $pdo, $userId;
    $stmt=$pdo->prepare("DELETE FROM invoices WHERE id=? AND user_id=?");
    $stmt->execute([$id,$userId]);
    if ($stmt->rowCount()===0) jsonResponse(['error'=>'Invoice not found'],404);
    recordAuditLog($userId, 'DELETE_INVOICE', "Deleted invoice ID $id");
    jsonResponse(['message'=>'Invoice deleted.']);
}

function generateInvoiceNumber(): string {
    global $pdo, $userId;
    $stmt=$pdo->prepare("SELECT invoice_number FROM invoices WHERE user_id=? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $last=$stmt->fetch();
    $next = ($last && preg_match('/INV-(\d+)/', $last['invoice_number'], $m)) ? (int)$m[1]+1 : 1;
    return 'INV-'.str_pad($next, 4, '0', STR_PAD_LEFT);
}
