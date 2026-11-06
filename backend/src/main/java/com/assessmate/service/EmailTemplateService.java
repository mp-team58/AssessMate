package com.assessmate.service;

import com.assessmate.dto.EmailContent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Premium Branded Transactional Email Design System for AssessMate.
 * Produces responsive, table-based, client-compatible (Gmail, Outlook, Apple Mail)
 * HTML and plain-text alternatives matching AssessMate's official visual identity.
 */
@Service
@Slf4j
public class EmailTemplateService {

    // Official AssessMate brand color palette (extracted from design tokens)
    public static final String COLOR_BRAND_PRIMARY = "#2F6F4E"; // Deep Forest Green (brand-500)
    public static final String COLOR_BRAND_DARK    = "#25573D"; // Deep Forest Hover/Dark (brand-600)
    public static final String COLOR_BRAND_LIGHT   = "#F0F7F3"; // Brand Tint Background (brand-50)
    public static final String COLOR_BRAND_BORDER  = "#B7D7C6"; // Brand Subtle Border (brand-200)

    public static final String COLOR_INK_HEADING   = "#16241F"; // Deep Ink / High Contrast (secondary-900)
    public static final String COLOR_INK_BODY      = "#2D3730"; // Primary Content Ink (secondary-700)
    public static final String COLOR_INK_MUTED     = "#56655D"; // Supporting Ink (secondary-500)
    public static final String COLOR_INK_SUBTLE    = "#7D8A83"; // Footer & Caption Ink (secondary-400)
    public static final String COLOR_INK_LIGHT     = "#AAB3AE"; // Light Disclaimer Ink (secondary-300)

    public static final String COLOR_SURFACE       = "#F1F4F2"; // Canvas Background
    public static final String COLOR_SURFACE_CARD  = "#F4F6F5"; // Secondary Surface Card (secondary-50)
    public static final String COLOR_BORDER_CARD   = "#D3D9D6"; // Card Outline Border (secondary-200)
    public static final String COLOR_BORDER_LIGHT  = "#E8EBE9"; // Light Divider Border (secondary-100)

    public static final String COLOR_ACCENT_ALERT  = "#C0562C"; // Warm Terracotta (accent-500)
    public static final String COLOR_ACCENT_BG     = "#FDF3EE"; // Alert Background (accent-50)
    public static final String COLOR_ACCENT_TITLE  = "#A04521"; // Alert Title (accent-600)
    public static final String COLOR_ACCENT_TEXT   = "#7F371B"; // Alert Text (accent-700)

    private static final String SUPPORT_EMAIL = "mail.assessmate@gmail.com";

    // -------------------------------------------------------------------------
    // 1. Registration OTP Email
    // -------------------------------------------------------------------------
    public EmailContent buildRegistrationOtpEmail(String name, String otp, int expiryMinutes) {
        String safeName = escapeOrDefault(name, "there");
        String safeOtp = HtmlUtils.htmlEscape(otp != null ? otp.trim() : "");
        String subject = "Verify your AssessMate account";
        String preheader = "Your AssessMate verification code is " + safeOtp + ". Valid for " + expiryMinutes + " minutes.";

        String greeting = "Hi " + safeName + ",";
        String mainContent = """
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: %s;">
              Thank you for creating an account with AssessMate. To verify your email address and activate your account, please enter the one-time code below:
            </p>
            %s
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: %s;">
              Enter this 6-digit verification code on the registration screen to complete your setup. Do not refresh or close the tab while verification is underway.
            </p>
            """.formatted(
                COLOR_INK_BODY,
                renderOtpCard(safeOtp, "One-Time Verification Code", expiryMinutes),
                COLOR_INK_MUTED
        );

        String securityNotice = "AssessMate representatives will never contact you asking for this code. If you did not create an account on AssessMate, you can safely ignore this email; no account will be created.";

        String html = renderLayout(preheader, "Account Verification", "Verify your AssessMate account", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Verify your account
            
            Hi %s,
            
            Thank you for creating an account with AssessMate.
            
            Your one-time verification code is:
            %s
            
            This code expires in %d minutes.
            
            Security Notice:
            AssessMate representatives will never ask you for this code. If you did not create an account on AssessMate, you can safely ignore this email.
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            
            Need help? Contact %s
            """.formatted(safeName, otp != null ? otp.trim() : "", expiryMinutes, SUPPORT_EMAIL);

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // 2. Forgot Password OTP Email
    // -------------------------------------------------------------------------
    public EmailContent buildPasswordResetOtpEmail(String otp, int expiryMinutes) {
        String safeOtp = HtmlUtils.htmlEscape(otp != null ? otp.trim() : "");
        String subject = "Reset your AssessMate password";
        String preheader = "Your password reset code is " + safeOtp + ". Valid for " + expiryMinutes + " minutes.";

        String greeting = "Hi there,";
        String mainContent = """
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: %s;">
              We received a request to reset the password for your AssessMate account. Please enter the verification code below to authorize your password update:
            </p>
            %s
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: %s;">
              Once verified, you will be prompted to choose a new password. For security reasons, this code can only be used once.
            </p>
            """.formatted(
                COLOR_INK_BODY,
                renderOtpCard(safeOtp, "Password Reset Code", expiryMinutes),
                COLOR_INK_MUTED
        );

        String securityNotice = "If you did not request a password reset, you can safely ignore this email. Your current password remains secure and no changes have been made to your account.";

        String html = renderLayout(preheader, "Security Verification", "Reset your AssessMate password", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Reset your password
            
            Hi there,
            
            We received a request to reset the password for your AssessMate account.
            
            Your password reset code is:
            %s
            
            This code expires in %d minutes.
            
            Security Notice:
            If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            
            Need help? Contact %s
            """.formatted(otp != null ? otp.trim() : "", expiryMinutes, SUPPORT_EMAIL);

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // 3. Password Reset Success Notification
    // -------------------------------------------------------------------------
    public EmailContent buildPasswordResetSuccessEmail(String name, String accountEmail) {
        String safeName = escapeOrDefault(name, "there");
        String safeEmail = escapeOrDefault(accountEmail, "your account");
        String subject = "Your AssessMate password was changed";
        String preheader = "Your AssessMate account password has been successfully updated.";

        String greeting = "Hi " + safeName + ",";
        String mainContent = """
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: %s;">
              This is a confirmation that the password for your AssessMate account (<strong>%s</strong>) was recently updated. All existing sessions have been terminated to safeguard your credentials.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 20px 0; background-color: %s; border: 1px solid %s; border-radius: 12px;">
              <tr>
                <td style="padding: 16px 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation">
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0;">Account:</td>
                      <td style="font-size: 13px; font-weight: 600; color: %s; text-align: right; padding: 4px 0;">%s</td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0;">Status:</td>
                      <td style="font-size: 13px; font-weight: 700; color: %s; text-align: right; padding: 4px 0;">Password Successfully Updated</td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0;">Session Security:</td>
                      <td style="font-size: 13px; font-weight: 600; color: %s; text-align: right; padding: 4px 0;">Previous tokens revoked</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: %s;">
              You can now sign in using your newly configured password.
            </p>
            """.formatted(
                COLOR_INK_BODY,
                safeEmail,
                COLOR_SURFACE_CARD,
                COLOR_BORDER_CARD,
                COLOR_INK_MUTED, COLOR_INK_HEADING, safeEmail,
                COLOR_INK_MUTED, COLOR_BRAND_PRIMARY,
                COLOR_INK_MUTED, COLOR_INK_HEADING,
                COLOR_INK_MUTED
        );

        String securityNotice = "If you did not authorize this password change, your account may be compromised. Please perform a password reset immediately or contact our security team at " + SUPPORT_EMAIL + ".";

        String html = renderLayout(preheader, "Account Security", "Your password has been changed", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Password Changed
            
            Hi %s,
            
            This is a confirmation that the password for your AssessMate account (%s) was successfully updated.
            
            Previous login sessions and tokens have been revoked.
            
            Security Alert:
            If you did not perform this change, please reset your password immediately or reach out to %s.
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            """.formatted(safeName, safeEmail, SUPPORT_EMAIL);

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // 4. Admin Invitation Email
    // -------------------------------------------------------------------------
    public EmailContent buildAdminInvitationEmail(String name, String setupUrl, int expiryMinutes) {
        String safeName = escapeOrDefault(name, "there");
        String safeUrl = HtmlUtils.htmlEscape(setupUrl != null ? setupUrl.trim() : "");
        String subject = "You've been invited as an Administrator on AssessMate";
        String preheader = "You have been invited to join AssessMate as a System Administrator. Please complete your password setup.";

        String greeting = "Hi " + safeName + ",";
        String mainContent = """
            <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: %s;">
              You have been invited to join the AssessMate administration team as a <strong>System Administrator</strong>.
            </p>
            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: %s;">
              As an administrator, you will have access to manage institutional exams, inspect proctoring activity, monitor user accounts, and oversee platform security policies.
            </p>
            %s
            %s
            """.formatted(
                COLOR_INK_BODY,
                COLOR_INK_BODY,
                renderCtaButton(safeUrl, "Set Up Administrator Password", expiryMinutes),
                renderDirectLinkBox(safeUrl)
        );

        String securityNotice = "This invitation link is single-use and will expire in " + expiryMinutes + " minutes. If you were not expecting this administrative invitation, you can safely ignore this email.";

        String html = renderLayout(preheader, "Administrator Access", "Welcome to AssessMate Administration", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Administrator Invitation
            
            Hi %s,
            
            You have been invited to join AssessMate as a System Administrator.
            
            Please visit the link below to set up your password and activate your administrator account:
            %s
            
            This invitation link expires in %d minutes.
            
            Security Notice:
            If you were not expecting this invitation, you can safely ignore this email.
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            
            Need help? Contact %s
            """.formatted(safeName, setupUrl != null ? setupUrl.trim() : "", expiryMinutes, SUPPORT_EMAIL);

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // 5. Admin Invitation Resend Email
    // -------------------------------------------------------------------------
    public EmailContent buildAdminInvitationResendEmail(String name, String setupUrl, int expiryMinutes) {
        String safeName = escapeOrDefault(name, "there");
        String safeUrl = HtmlUtils.htmlEscape(setupUrl != null ? setupUrl.trim() : "");
        String subject = "Your AssessMate Administrator Invitation (Resent)";
        String preheader = "Your administrator invitation link for AssessMate has been refreshed.";

        String greeting = "Hi " + safeName + ",";
        String mainContent = """
            <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: %s;">
              An existing administrator has re-issued your invitation to join AssessMate as a <strong>System Administrator</strong>. Any previous invitation links have been invalidated.
            </p>
            <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: %s;">
              Please click the button below to set up your password and activate your administrator credentials:
            </p>
            %s
            %s
            """.formatted(
                COLOR_INK_BODY,
                COLOR_INK_BODY,
                renderCtaButton(safeUrl, "Activate Administrator Account", expiryMinutes),
                renderDirectLinkBox(safeUrl)
        );

        String securityNotice = "This renewed link expires in " + expiryMinutes + " minutes and can only be used once. Never share administrative credentials or login links.";

        String html = renderLayout(preheader, "Administrator Access", "Administrator Invitation (Resent)", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Administrator Invitation (Resent)
            
            Hi %s,
            
            Your invitation to join AssessMate as a System Administrator has been re-issued.
            
            Please visit the updated link below to complete your password setup:
            %s
            
            This link expires in %d minutes.
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            """.formatted(safeName, setupUrl != null ? setupUrl.trim() : "", expiryMinutes);

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // 6. Admin Account Activated Email
    // -------------------------------------------------------------------------
    public EmailContent buildAdminAccountActivatedEmail(String name, String dashboardUrl) {
        String safeName = escapeOrDefault(name, "there");
        String safeUrl = HtmlUtils.htmlEscape(dashboardUrl != null ? dashboardUrl.trim() : "");
        String subject = "Administrator Account Activated - AssessMate";
        String preheader = "Your AssessMate administrator account is now active and ready to use.";

        String greeting = "Hi " + safeName + ",";
        String mainContent = """
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: %s;">
              Your administrator account setup is complete and your credentials are now active. You have full access to the AssessMate Administrator portal.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 20px 0; background-color: %s; border: 1px solid %s; border-radius: 12px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: %s; text-transform: uppercase; letter-spacing: 0.08em;">
                    &#10003; Account Active
                  </p>
                  <p style="margin: 0; font-size: 14px; color: %s; line-height: 1.5;">
                    Role: <strong>SYSTEM ADMINISTRATOR</strong><br/>
                    Access Level: Full platform audit, host management, candidate governance
                  </p>
                </td>
              </tr>
            </table>
            %s
            """.formatted(
                COLOR_INK_BODY,
                COLOR_BRAND_LIGHT,
                COLOR_BRAND_BORDER,
                COLOR_BRAND_DARK,
                COLOR_INK_BODY,
                renderCtaButton(safeUrl, "Access Administrator Dashboard", null)
        );

        String securityNotice = "Keep your administrator credentials strictly confidential. Ensure two-factor authentication or strong passwords are in place on all accessing devices.";

        String html = renderLayout(preheader, "Administrator Portal", "Administrator Account Activated", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Administrator Account Activated
            
            Hi %s,
            
            Your administrator account has been successfully configured and activated.
            
            You can sign in to the administration portal here:
            %s
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            """.formatted(safeName, dashboardUrl != null ? dashboardUrl.trim() : "");

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // 7. Exam Invitation Email
    // -------------------------------------------------------------------------
    public EmailContent buildExamInvitationEmail(
            String candidateName,
            String examTitle,
            String subjectName,
            String joinCode,
            String scheduledStart,
            Integer durationMinutes,
            String deviceAccess,
            String joinUrl
    ) {
        String safeName = escapeOrDefault(candidateName, "Candidate");
        String safeTitle = escapeOrDefault(examTitle, "Upcoming Assessment");
        String safeSubject = escapeOrDefault(subjectName, "Examination");
        String safeCode = HtmlUtils.htmlEscape(joinCode != null ? joinCode.trim() : "");
        String safeStart = escapeOrDefault(scheduledStart, "Scheduled Soon");
        String safeDuration = durationMinutes != null ? durationMinutes + " minutes" : "Standard duration";
        String safeDevice = "DESKTOP_ONLY".equalsIgnoreCase(deviceAccess)
                ? "Desktop / Laptop (Webcam &amp; Microphone Required)"
                : "Any supported browser";
        String safeUrl = HtmlUtils.htmlEscape(joinUrl != null ? joinUrl.trim() : "");

        String subject = "Exam Invitation: " + safeTitle;
        String preheader = "You have been invited to participate in " + safeTitle + ". Join code: " + safeCode;

        String greeting = "Hi " + safeName + ",";
        String mainContent = """
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: %s;">
              You have been registered for an upcoming proctored examination on AssessMate:
            </p>

            <!-- Exam Details Card -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 20px 0; background-color: %s; border: 1px solid %s; border-radius: 12px;">
              <tr>
                <td style="padding: 20px;">
                  <h3 style="margin: 0 0 12px 0; font-family: 'Fraunces', Georgia, serif; font-size: 20px; color: %s; font-weight: 700;">
                    %s
                  </h3>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation">
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0; width: 36%%;">Subject:</td>
                      <td style="font-size: 13px; font-weight: 600; color: %s; padding: 4px 0;">%s</td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0;">Scheduled Start:</td>
                      <td style="font-size: 13px; font-weight: 600; color: %s; padding: 4px 0;">%s</td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0;">Duration:</td>
                      <td style="font-size: 13px; font-weight: 600; color: %s; padding: 4px 0;">%s</td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: %s; padding: 4px 0;">Device Policy:</td>
                      <td style="font-size: 13px; font-weight: 600; color: %s; padding: 4px 0;">%s</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Join Code Card -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 24px 0; background-color: %s; border: 1.5px solid %s; border-radius: 12px; text-align: center;">
              <tr>
                <td style="padding: 22px 16px;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: %s; letter-spacing: 0.12em; text-transform: uppercase;">
                    Candidate Join Code
                  </p>
                  <div class="otp-code" style="font-family: 'SF Pro Mono', 'Cascadia Code', Menlo, Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: %s; line-height: 1.2; padding: 6px 0;">
                    %s
                  </div>
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: %s; font-weight: 500;">
                    Enter this code on the AssessMate candidate lobby to begin your assessment
                  </p>
                </td>
              </tr>
            </table>

            %s
            """.formatted(
                COLOR_INK_BODY,
                COLOR_SURFACE_CARD, COLOR_BORDER_CARD,
                COLOR_INK_HEADING,
                safeTitle,
                COLOR_INK_MUTED, COLOR_INK_HEADING, safeSubject,
                COLOR_INK_MUTED, COLOR_INK_HEADING, safeStart,
                COLOR_INK_MUTED, COLOR_INK_HEADING, safeDuration,
                COLOR_INK_MUTED, COLOR_BRAND_DARK, safeDevice,
                COLOR_BRAND_LIGHT, COLOR_BRAND_BORDER,
                COLOR_INK_MUTED,
                COLOR_BRAND_PRIMARY,
                safeCode,
                COLOR_BRAND_DARK,
                safeUrl != null && !safeUrl.isEmpty() ? renderCtaButton(safeUrl, "Enter Exam Lobby", null) : ""
        );

        String securityNotice = "This assessment utilizes real-time proctoring and browser monitoring. Please ensure you are in a quiet, well-lit room with your webcam and microphone verified prior to joining.";

        String html = renderLayout(preheader, "Examination Schedule", "You've been invited to an Exam", greeting, mainContent, securityNotice);

        String plainText = """
            AssessMate - Exam Invitation
            
            Hi %s,
            
            You have been invited to participate in an examination on AssessMate:
            Title: %s
            Subject: %s
            Scheduled Start: %s
            Duration: %s
            Join Code: %s
            
            Join URL: %s
            
            Please arrive before the scheduled start time with a working camera and microphone.
            
            Warm regards,
            The AssessMate Team
            Intelligent assessment, uncompromised integrity.
            """.formatted(safeName, safeTitle, safeSubject, safeStart, safeDuration, safeCode, safeUrl);

        return new EmailContent(subject, html, plainText);
    }

    // -------------------------------------------------------------------------
    // Core Layout Engine (Table-based, Inline Styles, Outlook & Gmail Safe)
    // -------------------------------------------------------------------------
    private String renderLayout(
            String preheader,
            String categoryPill,
            String heading,
            String greeting,
            String mainContentHtml,
            String securityNoticeHtml
    ) {
        String safePreheader = HtmlUtils.htmlEscape(preheader != null ? preheader : "");
        String safePill = HtmlUtils.htmlEscape(categoryPill != null ? categoryPill : "NOTIFICATION");
        String safeHeading = HtmlUtils.htmlEscape(heading != null ? heading : "AssessMate Notification");

        return """
            <!DOCTYPE html>
            <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <title>%s</title>
              <!--[if mso]>
              <style type="text/css">
                table { border-collapse: collapse; border-spacing: 0; }
                td, div { font-family: Arial, sans-serif !important; }
              </style>
              <![endif]-->
              <style type="text/css">
                body, table, td, a { -webkit-text-size-adjust: 100%%; -ms-text-size-adjust: 100%%; }
                table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
                body { margin: 0; padding: 0; width: 100%% !important; background-color: %s; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                @media only screen and (max-width: 620px) {
                  .email-container { width: 100%% !important; max-width: 100%% !important; }
                  .content-padding { padding: 24px 20px !important; }
                  .header-padding { padding: 16px 20px !important; }
                  .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
                }
              </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: %s; -webkit-font-smoothing: antialiased;">
              <!-- Preheader preview text in email clients -->
              <div style="display: none; font-size: 1px; color: %s; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                %s
              </div>

              <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="background-color: %s; padding: 32px 12px;">
                <tr>
                  <td align="center">
                    <!-- Main Container Card -->
                    <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" role="presentation" style="max-width: 600px; width: 100%%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid %s; box-shadow: 0 4px 20px rgba(22, 36, 31, 0.05); overflow: hidden;">
                      
                      <!-- Brand Header -->
                      <tr>
                        <td class="header-padding" style="padding: 24px 36px; border-bottom: 1px solid %s; background-color: #FFFFFF;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation">
                            <tr>
                              <td align="left" vertical-align="middle">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                                  <tr>
                                    <td style="vertical-align: middle; padding-right: 12px;">
                                      <!-- AssessMate Brand Mark Badge -->
                                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 36px; height: 36px; border-collapse: separate; border-radius: 10px; background-color: %s;">
                                        <tr>
                                          <td align="center" valign="middle" style="width: 36px; height: 36px; border-radius: 10px; background-color: %s; text-align: center; vertical-align: middle; padding: 0;">
                                            <!--[if mso]>
                                            <span style="font-family: Arial, sans-serif; font-size: 20px; color: #FFFFFF; font-weight: bold; line-height: 36px;">&#10003;</span>
                                            <![endif]-->
                                            <!--[if !mso]><!-->
                                            <svg width="20" height="20" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
                                              <path d="M17 33.5L27.5 44L47 21" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            <!--<![endif]-->
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                    <td style="vertical-align: middle;">
                                      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 21px; font-weight: 800; color: %s; letter-spacing: -0.5px;">AssessMate<span style="color: %s;">.</span></span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td align="right" vertical-align="middle">
                                <span style="display: inline-block; font-size: 10px; font-weight: 700; color: %s; background-color: %s; border: 1px solid %s; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.08em;">
                                  Official
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Content Body -->
                      <tr>
                        <td class="content-padding" style="padding: 36px 36px 28px 36px;">
                          <!-- Category Pill -->
                          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 14px;">
                            <tr>
                              <td style="background-color: %s; border: 1px solid %s; padding: 4px 12px; border-radius: 16px;">
                                <span style="font-size: 11px; font-weight: 700; color: %s; letter-spacing: 0.08em; text-transform: uppercase;">
                                  %s
                                </span>
                              </td>
                            </tr>
                          </table>

                          <!-- Main Heading (Fraunces / Georgia) -->
                          <h1 style="margin: 0 0 16px 0; font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.25; color: %s; font-weight: 700;">
                            %s
                          </h1>

                          <!-- Salutation -->
                          <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: %s; font-weight: 500;">
                            %s
                          </p>

                          <!-- Dynamic Main Content -->
                          %s

                          <!-- Security Notice Callout (if present) -->
                          %s

                          <!-- Sign-off Block -->
                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin-top: 28px; border-top: 1px solid %s; padding-top: 20px;">
                            <tr>
                              <td>
                                <p style="margin: 0 0 4px 0; font-size: 14px; color: %s;">
                                  Warm regards,
                                </p>
                                <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: %s;">
                                  The AssessMate Team
                                </p>
                                <p style="margin: 0; font-size: 12px; color: %s;">
                                  Intelligent assessment, uncompromised integrity.
                                </p>
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>

                      <!-- Brand Footer -->
                      <tr>
                        <td style="background-color: %s; border-top: 1px solid %s; padding: 24px 36px; text-align: center;">
                          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: %s;">
                            AssessMate Online Assessment &amp; Proctoring Platform
                          </p>
                          <p style="margin: 0 0 12px 0; font-size: 12px; color: %s; line-height: 1.5;">
                            Need assistance? Contact our team at <a href="mailto:%s" style="color: %s; text-decoration: underline;">%s</a>
                          </p>
                          <p style="margin: 0 0 8px 0; font-size: 11px; color: %s; line-height: 1.4;">
                            This is an automated transactional notification sent from AssessMate. Please do not reply directly to this email.
                          </p>
                          <p style="margin: 0; font-size: 11px; color: %s;">
                            &copy; 2026 AssessMate. All rights reserved.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                safeHeading,
                COLOR_SURFACE,
                COLOR_SURFACE,
                COLOR_SURFACE,
                safePreheader,
                COLOR_SURFACE,
                COLOR_BORDER_LIGHT,
                COLOR_BORDER_LIGHT,
                COLOR_BRAND_PRIMARY,
                COLOR_BRAND_PRIMARY,
                COLOR_INK_HEADING,
                COLOR_BRAND_PRIMARY,
                COLOR_INK_MUTED, COLOR_SURFACE_CARD, COLOR_BORDER_CARD,
                COLOR_BRAND_LIGHT, COLOR_BRAND_BORDER, COLOR_BRAND_DARK, safePill,
                COLOR_INK_HEADING, safeHeading,
                COLOR_INK_BODY, greeting,
                mainContentHtml,
                renderSecurityCallout(securityNoticeHtml),
                COLOR_SURFACE,
                COLOR_INK_MUTED,
                COLOR_INK_HEADING,
                COLOR_INK_SUBTLE,
                COLOR_SURFACE_CARD, COLOR_BORDER_LIGHT,
                COLOR_INK_BODY,
                COLOR_INK_SUBTLE,
                SUPPORT_EMAIL, COLOR_BRAND_PRIMARY, SUPPORT_EMAIL,
                COLOR_INK_LIGHT,
                COLOR_INK_LIGHT
        );
    }

    private String renderOtpCard(String safeOtp, String label, int expiryMinutes) {
        return """
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 24px 0; background-color: %s; border: 1.5px solid %s; border-radius: 12px; text-align: center;">
              <tr>
                <td style="padding: 24px 16px;">
                  <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: %s; letter-spacing: 0.12em; text-transform: uppercase;">
                    %s
                  </p>
                  <div class="otp-code" style="font-family: 'SF Pro Mono', 'Cascadia Code', Menlo, Consolas, Monaco, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: %s; line-height: 1.2; padding: 6px 0;">
                    %s
                  </div>
                  <p style="margin: 10px 0 0 0; font-size: 13px; color: %s; font-weight: 600;">
                    &#x23F1; Valid for %d minutes &bull; Single use
                  </p>
                </td>
              </tr>
            </table>
            """.formatted(
                COLOR_BRAND_LIGHT,
                COLOR_BRAND_BORDER,
                COLOR_INK_MUTED,
                label,
                COLOR_BRAND_PRIMARY,
                safeOtp,
                COLOR_BRAND_DARK,
                expiryMinutes
        );
    }

    private String renderCtaButton(String safeUrl, String buttonText, Integer expiryMinutes) {
        String expiryNotice = expiryMinutes != null
                ? "<p style=\"margin: 8px 0 0 0; font-size: 12px; color: " + COLOR_INK_MUTED + "; text-align: center;\">&#x23F1; This link expires in " + expiryMinutes + " minutes</p>"
                : "";

        return """
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 28px 0;">
              <tr>
                <td align="center">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td align="center" style="border-radius: 8px; background-color: %s;">
                        <a href="%s" target="_blank" style="font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; background-color: %s; border: 1px solid %s; box-shadow: 0 2px 4px rgba(47, 111, 78, 0.2);">
                          %s &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  %s
                </td>
              </tr>
            </table>
            """.formatted(
                COLOR_BRAND_PRIMARY,
                safeUrl,
                COLOR_BRAND_PRIMARY,
                COLOR_BRAND_DARK,
                HtmlUtils.htmlEscape(buttonText),
                expiryNotice
        );
    }

    private String renderDirectLinkBox(String safeUrl) {
        return """
            <div style="background-color: %s; border: 1px solid %s; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: %s; word-break: break-all; margin-top: 16px;">
              <span style="font-weight: 600; color: %s; display: block; margin-bottom: 4px;">Direct Link:</span>
              <a href="%s" style="color: %s; text-decoration: underline;">%s</a>
            </div>
            """.formatted(
                COLOR_SURFACE_CARD,
                COLOR_BORDER_CARD,
                COLOR_INK_MUTED,
                COLOR_INK_HEADING,
                safeUrl,
                COLOR_BRAND_PRIMARY,
                safeUrl
        );
    }

    private String renderSecurityCallout(String securityNoticeHtml) {
        if (securityNoticeHtml == null || securityNoticeHtml.trim().isEmpty()) {
            return "";
        }
        return """
            <table border="0" cellpadding="0" cellspacing="0" width="100%%" role="presentation" style="margin: 24px 0; background-color: %s; border-left: 4px solid %s; border-radius: 0 8px 8px 0;">
              <tr>
                <td style="padding: 14px 16px;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: %s; text-transform: uppercase; letter-spacing: 0.06em;">
                    &#x1F6E1;&#xFE0F; Security Notice
                  </p>
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: %s;">
                    %s
                  </p>
                </td>
              </tr>
            </table>
            """.formatted(
                COLOR_ACCENT_BG,
                COLOR_ACCENT_ALERT,
                COLOR_ACCENT_TITLE,
                COLOR_ACCENT_TEXT,
                securityNoticeHtml
        );
    }

    private String escapeOrDefault(String val, String fallback) {
        if (val == null || val.trim().isEmpty()) {
            return fallback;
        }
        return HtmlUtils.htmlEscape(val.trim());
    }
}

