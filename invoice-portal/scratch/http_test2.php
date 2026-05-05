<?php
$data = array(
    'name' => 'Final HTDOCS Test',
    'email' => 'finalhtdocs@example.com',
    'password' => 'password123',
    'role' => 'admin' // Attempting to bypass again
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);

$context  = stream_context_create($options);
$result = file_get_contents('http://localhost/invoice-portal/backend/api/auth.php?action=register', false, $context);
if ($result === FALSE) {
    echo "Error making request";
} else {
    echo "Result: " . $result;
}
