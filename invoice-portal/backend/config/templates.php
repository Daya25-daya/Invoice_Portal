<?php
/**
 * Email Templates for InvoiceFlow
 */

function getEmailTemplate($type, $data) {
    $companyName = $data['company_name'] ?? 'InvoiceFlow';
    $companyLogo = $data['company_logo'] ?? '';
    $primaryColor = '#2563eb';

    $header = "
    <div style='text-align: center; margin-bottom: 30px;'>
        " . ($companyLogo ? "<img src='{$companyLogo}' style='max-height: 50px; margin-bottom: 15px;'>" : "") . "
        <div style='font-size: 20px; font-weight: bold; color: #0f172a;'>{$companyName}</div>
    </div>";

    $footer = "
    <div style='margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8;'>
        Sent by {$companyName} via <b>InvoiceFlow</b>.<br>
        If you have any questions, please contact us at " . FROM_EMAIL . ".
    </div>";

    $styles = "
    <style>
        body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .btn { display: inline-block; background-color: {$primaryColor}; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; margin-top: 25px; }
        .amount-card { background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 25px 0; }
        .amount-label { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .amount-value { font-size: 32px; font-weight: 900; color: #0f172a; }
    </style>";

    $content = "";

    switch ($type) {
        case 'new_invoice':
            $content = "
            <h1 style='font-size: 24px; font-weight: 800; color: #1e293b; margin-top: 0;'>New Invoice Received</h1>
            <p style='font-size: 16px; color: #475569; line-height: 1.6;'>
                Hello {$data['client_name']},<br><br>
                A new invoice has been generated for your recent business with <b>{$companyName}</b>.
            </p>
            <div class='amount-card'>
                <div class='amount-label'>Invoice #{$data['invoice_number']}</div>
                <div class='amount-value'>₹" . number_format($data['total'], 2) . "</div>
                <div style='font-size: 14px; color: #64748b; margin-top: 10px;'>Due on <b>{$data['due_date']}</b></div>
            </div>
            <center><a href='{$data['login_url']}' class='btn'>View & Pay Online</a></center>";
            break;

        case 'payment_success':
            $content = "
            <div style='text-align: center;'>
                <div style='width: 60px; h-60px; background: #ecfdf5; color: #059669; border-radius: 50%; display: inline-flex; items-center; justify-center; font-size: 30px; margin-bottom: 20px;'>✓</div>
                <h1 style='font-size: 24px; font-weight: 800; color: #1e293b; margin-top: 0;'>Payment Confirmed</h1>
                <p style='font-size: 16px; color: #475569; line-height: 1.6;'>
                    Thank you, {$data['client_name']}! We've successfully received your payment for invoice <b>#{$data['invoice_number']}</b>.
                </p>
            </div>
            <div class='amount-card'>
                <div class='amount-label'>Amount Paid</div>
                <div class='amount-value' style='color: #059669;'>₹" . number_format($data['amount'], 2) . "</div>
                <div style='font-size: 14px; color: #64748b; margin-top: 10px;'>Paid on " . date('d M, Y') . "</div>
            </div>";
            break;

        case 'overdue_reminder':
            $content = "
            <h1 style='font-size: 24px; font-weight: 800; color: #991b1b; margin-top: 0;'>Invoice Overdue Notice</h1>
            <p style='font-size: 16px; color: #475569; line-height: 1.6;'>
                Hi {$data['client_name']},<br><br>
                This is a friendly reminder that your payment for invoice <b>#{$data['invoice_number']}</b> was due on {$data['due_date']}.
            </p>
            <div class='amount-card' style='background: #fef2f2;'>
                <div class='amount-label' style='color: #ef4444;'>Balance Outstanding</div>
                <div class='amount-value' style='color: #991b1b;'>₹" . number_format($data['balance'], 2) . "</div>
            </div>
            <p style='font-size: 14px; color: #64748b;'>We would appreciate if you could settle this at your earliest convenience.</p>
            <center><a href='{$data['login_url']}' class='btn' style='background-color: #dc2626;'>Settle Outstanding Balance</a></center>";
            break;
    }

    return "
    <html>
    <head>{$styles}</head>
    <body>
        <div class='wrapper'>
            {$header}
            {$content}
            {$footer}
        </div>
    </body>
    </html>";
}
