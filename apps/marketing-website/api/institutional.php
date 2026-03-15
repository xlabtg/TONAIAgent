<?php
/**
 * TON AI Agent - Institutional Request Handler
 *
 * This PHP script handles institutional partnership and enterprise inquiry forms.
 */

// Configuration
$config = [
    'admin_email' => 'institutional@tonaiagent.com',
    'cc_emails' => ['sales@tonaiagent.com', 'partnerships@tonaiagent.com'],
    'from_email' => 'noreply@tonaiagent.com',
    'from_name' => 'TON AI Agent Institutional',
    'success_redirect' => '../institutional/?submitted=1',
    'error_redirect' => '../institutional/?error=1',
    'enable_file_logging' => true,
    'log_file' => '../logs/institutional.log',
    'enable_recaptcha' => false,
    'recaptcha_secret' => '',
    // CRM Integration (e.g., HubSpot, Salesforce)
    'crm_enabled' => false,
    'crm_webhook_url' => '',
];

// Security headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get and validate input
$fields = [
    'company_name' => filter_input(INPUT_POST, 'company_name', FILTER_SANITIZE_STRING),
    'contact_name' => filter_input(INPUT_POST, 'contact_name', FILTER_SANITIZE_STRING),
    'email' => filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL),
    'phone' => filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING),
    'company_type' => filter_input(INPUT_POST, 'company_type', FILTER_SANITIZE_STRING),
    'aum' => filter_input(INPUT_POST, 'aum', FILTER_SANITIZE_STRING),
    'interest' => filter_input(INPUT_POST, 'interest', FILTER_SANITIZE_STRING),
    'message' => filter_input(INPUT_POST, 'message', FILTER_SANITIZE_STRING),
    'timeline' => filter_input(INPUT_POST, 'timeline', FILTER_SANITIZE_STRING),
];

// Clean and trim
foreach ($fields as $key => $value) {
    $fields[$key] = trim($value ?? '');
}

// Validation
$errors = [];

if (empty($fields['company_name'])) {
    $errors[] = 'Company name is required';
}

if (empty($fields['contact_name'])) {
    $errors[] = 'Contact name is required';
}

if (!$fields['email'] || !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Valid email address is required';
}

if (empty($fields['company_type'])) {
    $errors[] = 'Please select your company type';
}

// Honeypot check
if (!empty($_POST['fax'])) {
    sleep(2);
    echo json_encode(['success' => true]);
    exit;
}

if (!empty($errors)) {
    http_response_code(400);
    if (isset($_POST['ajax'])) {
        echo json_encode(['success' => false, 'errors' => $errors]);
    } else {
        header('Location: ' . $config['error_redirect']);
    }
    exit;
}

// Log submission
if ($config['enable_file_logging']) {
    $log_dir = dirname($config['log_file']);
    if (!is_dir($log_dir)) {
        mkdir($log_dir, 0755, true);
    }

    $log_entry = sprintf(
        "[%s] Institutional inquiry: %s (%s) - %s <%s> - Type: %s, AUM: %s\n",
        date('Y-m-d H:i:s'),
        $fields['company_name'],
        $fields['company_type'],
        $fields['contact_name'],
        $fields['email'],
        $fields['interest'],
        $fields['aum']
    );

    file_put_contents($config['log_file'], $log_entry, FILE_APPEND | LOCK_EX);
}

// Build email
$company_types = [
    'hedge_fund' => 'Hedge Fund',
    'asset_manager' => 'Asset Manager',
    'family_office' => 'Family Office',
    'dao' => 'DAO / Treasury',
    'exchange' => 'Exchange',
    'market_maker' => 'Market Maker',
    'corporate' => 'Corporate Treasury',
    'other' => 'Other'
];

$aum_ranges = [
    'under_1m' => 'Under $1M',
    '1m_10m' => '$1M - $10M',
    '10m_50m' => '$10M - $50M',
    '50m_100m' => '$50M - $100M',
    '100m_500m' => '$100M - $500M',
    'over_500m' => 'Over $500M',
    'not_disclosed' => 'Prefer not to disclose'
];

$subject = '[INSTITUTIONAL] New Inquiry: ' . $fields['company_name'];

$body = "=== NEW INSTITUTIONAL INQUIRY ===\n\n";
$body .= "Company Information:\n";
$body .= "--------------------\n";
$body .= "Company Name: {$fields['company_name']}\n";
$body .= "Company Type: " . ($company_types[$fields['company_type']] ?? $fields['company_type']) . "\n";
$body .= "AUM Range: " . ($aum_ranges[$fields['aum']] ?? $fields['aum']) . "\n\n";

$body .= "Contact Information:\n";
$body .= "--------------------\n";
$body .= "Contact Name: {$fields['contact_name']}\n";
$body .= "Email: {$fields['email']}\n";
$body .= "Phone: " . ($fields['phone'] ?: 'Not provided') . "\n\n";

$body .= "Interest & Timeline:\n";
$body .= "--------------------\n";
$body .= "Primary Interest: " . ($fields['interest'] ?: 'Not specified') . "\n";
$body .= "Timeline: " . ($fields['timeline'] ?: 'Not specified') . "\n\n";

if (!empty($fields['message'])) {
    $body .= "Additional Message:\n";
    $body .= "--------------------\n";
    $body .= $fields['message'] . "\n\n";
}

$body .= "Submission Details:\n";
$body .= "--------------------\n";
$body .= "Date: " . date('Y-m-d H:i:s T') . "\n";
$body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";

$headers = [
    'From: ' . $config['from_name'] . ' <' . $config['from_email'] . '>',
    'Reply-To: ' . $fields['contact_name'] . ' <' . $fields['email'] . '>',
    'Cc: ' . implode(', ', $config['cc_emails']),
    'X-Priority: 1',
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8'
];

$mail_sent = @mail($config['admin_email'], $subject, $body, implode("\r\n", $headers));

// Send to CRM webhook if enabled
if ($config['crm_enabled'] && !empty($config['crm_webhook_url'])) {
    $crm_data = json_encode([
        'type' => 'institutional_inquiry',
        'company' => $fields['company_name'],
        'company_type' => $fields['company_type'],
        'aum' => $fields['aum'],
        'contact_name' => $fields['contact_name'],
        'email' => $fields['email'],
        'phone' => $fields['phone'],
        'interest' => $fields['interest'],
        'timeline' => $fields['timeline'],
        'message' => $fields['message'],
        'timestamp' => date('c'),
        'source' => 'website'
    ]);

    $ch = curl_init($config['crm_webhook_url']);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $crm_data,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 10
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// Send confirmation to user
$confirm_subject = 'Thank you for your interest in TON AI Agent';
$confirm_body = "Dear {$fields['contact_name']},\n\n";
$confirm_body .= "Thank you for your interest in TON AI Agent's institutional solutions.\n\n";
$confirm_body .= "We have received your inquiry and a member of our institutional team will be in touch within 1-2 business days.\n\n";
$confirm_body .= "In the meantime, you may want to review:\n";
$confirm_body .= "- Our institutional overview: https://tonaiagent.com/institutional/\n";
$confirm_body .= "- Security documentation: https://tonaiagent.com/security/\n";
$confirm_body .= "- Developer documentation: https://tonaiagent.com/developers/\n\n";
$confirm_body .= "Best regards,\n";
$confirm_body .= "The TON AI Agent Institutional Team\n";

$confirm_headers = [
    'From: TON AI Agent Institutional <' . $config['from_email'] . '>',
    'Content-Type: text/plain; charset=UTF-8'
];

@mail($fields['email'], $confirm_subject, $confirm_body, implode("\r\n", $confirm_headers));

// Response
if (isset($_POST['ajax'])) {
    echo json_encode([
        'success' => true,
        'message' => 'Your inquiry has been submitted successfully. Our institutional team will contact you soon.'
    ]);
} else {
    header('Location: ' . $config['success_redirect']);
}
