package com.assessmate.service;

import com.assessmate.dto.EmailContent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AssessMate transactional email templates.
 *
 * One shared layout (logo -> heading -> content -> footer) is used by every email so they all look
 * the same. Every email has an HTML part and a matching plain-text part.
 *
 * Design rules that matter for inbox clients:
 *  - The logo is a normal public HTTPS image inside a link to the website (no attachment, no CID, no base64).
 *  - A verification code is ONE uninterrupted run of digits in its own table cell, shortly after a
 *    short sentence ending in a colon, and appears the same way in the plain-text part.
 *  - The code never appears in the subject or the inbox preview text (preheader).
 */
@Service
public class EmailTemplateService {

    private static final Logger log = LoggerFactory.getLogger(EmailTemplateService.class);

    /** OTP presentation. MINIMAL is a plain Namecheap-style box; BRANDED is the AssessMate card. */
    public enum OtpLayout { BRANDED, MINIMAL }

    // ---- Brand palette (all colours live here; change them in one place) --------------------------
    public static final String COLOR_BRAND_PRIMARY = "#2F6F4E"; // Primary
    public static final String COLOR_BRAND_DARK    = "#25573D"; // Button border / hover
    public static final String COLOR_BRAND_LIGHT   = "#F0F7F3"; // Tint background
    public static final String COLOR_BRAND_BORDER  = "#B7D7C6"; // Tint border

    public static final String COLOR_INK_HEADING   = "#16241F";
    public static final String COLOR_INK_BODY      = "#2D3730";
    public static final String COLOR_INK_MUTED     = "#68756D";
    public static final String COLOR_INK_SUBTLE    = "#7D8A83";
    public static final String COLOR_INK_LIGHT     = "#AAB3AE";

    public static final String COLOR_BG_CANVAS     = "#F1F4F2";
    public static final String COLOR_BG_EMAIL      = "#F4F6F4"; // outer background
    public static final String COLOR_BG_CONTENT    = "#FFFFFF"; // card
    public static final String COLOR_BORDER        = "#E1E8E2";

    public static final String COLOR_ACCENT_ALERT  = "#C0562C";
    public static final String COLOR_ACCENT_BG     = "#FDF3EE";
    public static final String COLOR_ACCENT_TITLE  = "#A04521";
    public static final String COLOR_ACCENT_TEXT   = "#7F371B";

    private static final String FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    private static final String MONO = "'SF Mono', 'Cascadia Mono', Menlo, Consolas, 'Liberation Mono', monospace";

    /** Official horizontal logo (logo.png) is 319 x 80 px. */
    private static final int LOGO_SOURCE_WIDTH = 319;
    private static final int LOGO_SOURCE_HEIGHT = 80;

    private static final String DEFAULT_SITE = "https://assessmate.me";
    private static final String DEFAULT_LOGO = "https://assessmate.me/logo.png";
    private static final String DEFAULT_LOGIN = "https://assessmate.me/login";
    private static final String DEFAULT_RESET = "https://assessmate.me/forgot-password";
    private static final String DEFAULT_SUPPORT = "mail@assessmate.me";

    // ---- Configuration -------------------------------------------------------------------------------
    @Value("${app.mail.website-url:https://assessmate.me}")
    private String websiteUrl = DEFAULT_SITE;

    @Value("${app.mail.logo-url:https://assessmate.me/logo.png}")
    private String logoUrl = DEFAULT_LOGO;

    @Value("${app.mail.login-url:https://assessmate.me/login}")
    private String loginUrl = DEFAULT_LOGIN;

    @Value("${app.mail.reset-url:https://assessmate.me/forgot-password}")
    private String resetUrl = DEFAULT_RESET;

    @Value("${app.mail.support-email:mail@assessmate.me}")
    private String supportEmail = DEFAULT_SUPPORT;

    /** Displayed logo width in px (the 319 px source is crisp up to ~220 px on high-DPI screens). */
    @Value("${app.mail.logo-width:210}")
    private int logoWidth = 210;

    /** "branded" (default) or "minimal"; used by buildConfirmationCodeEmail. */
    @Value("${app.mail.otp-layout:branded}")
    private String otpLayout = "branded";

    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String v) { this.websiteUrl = v; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String v) { this.logoUrl = v; }
    public String getLoginUrl() { return loginUrl; }
    public void setLoginUrl(String v) { this.loginUrl = v; }
    public String getResetUrl() { return resetUrl; }
    public void setResetUrl(String v) { this.resetUrl = v; }
    public String getSupportEmail() { return supportEmail; }
    public void setSupportEmail(String v) { this.supportEmail = v; }
    public int getLogoWidth() { return logoWidth; }
    public void setLogoWidth(int v) { this.logoWidth = v; }
    public String getOtpLayout() { return otpLayout; }
    public void setOtpLayout(String v) { this.otpLayout = v; }

    // =====================================================================================================
    // 1. Verification codes
    // =====================================================================================================

    /** Registration: "Verify your AssessMate account". */
    public EmailContent buildRegistrationOtpEmail(String name, String otp, int expiryMinutes) {
        return otpEmail(new OtpSpec(
                "Verify your AssessMate account",
                "Verify your email address",
                "Confirm your email address to finish creating your AssessMate account.",
                greeting(name, "there"),
                "Thanks for signing up for AssessMate. Enter the code below on the verification screen to finish creating your account.",
                "Your verification code is:",
                "If you did not request this code, you can safely ignore this email. No account will be created without verification."),
                otp, expiryMinutes, OtpLayout.BRANDED);
    }

    /** General verification: same layout, subject "Your AssessMate verification code". */
    public EmailContent buildOtpVerificationEmail(String name, String otp, int expiryMinutes) {
        return otpEmail(new OtpSpec(
                "Your AssessMate verification code",
                "Your verification code",
                "Use the code inside to verify your AssessMate account.",
                greeting(name, "there"),
                "We received a request to verify your AssessMate account.",
                "Your verification code is:",
                "If you did not request this code, you can ignore this email."),
                otp, expiryMinutes, OtpLayout.BRANDED);
    }

    /** Confirmation code (Variant B by default, Variant A when app.mail.otp-layout=minimal). */
    public EmailContent buildConfirmationCodeEmail(String name, String otp, int expiryMinutes) {
        return buildConfirmationCodeEmail(name, otp, expiryMinutes,
                "minimal".equalsIgnoreCase(otpLayout == null ? "" : otpLayout.trim()) ? OtpLayout.MINIMAL : OtpLayout.BRANDED);
    }

    /** Variant A (MINIMAL) and Variant B (BRANDED) have identical wording; only the code box styling differs. */
    public EmailContent buildConfirmationCodeEmail(String name, String otp, int expiryMinutes, OtpLayout layout) {
        return otpEmail(new OtpSpec(
                "Your AssessMate confirmation code",
                "Your confirmation code",
                "Use the code inside to confirm your AssessMate account.",
                greeting(name, "there"),
                "We received a request to verify your AssessMate account.",
                "Your verification code is:",
                "If you did not request this code, you can ignore this email."),
                otp, expiryMinutes, layout);
    }

    /** Variant C: password-recovery code. */
    public EmailContent buildPasswordResetOtpEmail(String otp, int expiryMinutes) {
        return otpEmail(new OtpSpec(
                "Reset your AssessMate password",
                "Your password reset code",
                "Use the code inside to reset your AssessMate password.",
                "Hello,",
                "We received a request to reset your AssessMate password. Enter the code below to continue. You will then be asked to choose a new password.",
                "Your password reset code is:",
                "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged."),
                otp, expiryMinutes, "minimal".equalsIgnoreCase(otpLayout == null ? "" : otpLayout.trim()) ? OtpLayout.MINIMAL : OtpLayout.BRANDED);
    }

    private record OtpSpec(String subject, String heading, String preheader, String greeting,
                           String intro, String label, String ignoreNote) {}

    private EmailContent otpEmail(OtpSpec s, String otp, int expiryMinutes, OtpLayout layout) {
        String code = otp == null ? "" : otp.trim();
        String body = p(esc(s.intro()))
                + pLabel(esc(s.label()))
                + otpBox(esc(code), layout)
                + p("This code expires in " + expiryMinutes + " minutes and can only be used once. Never share it with anyone.")
                + pMuted(esc(s.ignoreNote()));

        String html = layout(s.heading(), s.preheader(), s.greeting(), body);

        String text = plain(s.heading(), s.greeting(),
                s.intro() + "\n\n" + s.label() + "\n\n" + code + "\n\n"
                        + "This code expires in " + expiryMinutes + " minutes and can only be used once. Never share it with anyone.\n\n"
                        + s.ignoreNote());
        return new EmailContent(s.subject(), html, text);
    }

    // =====================================================================================================
    // 2. Password reset (link)
    // =====================================================================================================
    public EmailContent buildPasswordResetEmail(String name, String resetLink, int expiryMinutes) {
        String link = requireHttpUrl(resetLink, "Password reset link");
        String body = p("We received a request to reset your AssessMate password.")
                + p("Use the button below to choose a new password.")
                + button(link, "Reset password", expiryMinutes)
                + linkFallback(link)
                + pMuted("If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.");

        String text = plain("Reset your password", greeting(name, "there"),
                "We received a request to reset your AssessMate password.\n"
                        + "Use the link below to choose a new password:\n" + link + "\n\n"
                        + "This link expires in " + expiryMinutes + " minutes.\n\n"
                        + "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.");
        return new EmailContent("Reset your AssessMate password",
                layout("Reset your password", "Choose a new password for your AssessMate account.", greeting(name, "there"), body), text);
    }

    // =====================================================================================================
    // 3. Welcome
    // =====================================================================================================
    public EmailContent buildWelcomeEmail(String name, String role, String customLoginUrl) {
        String target = customLoginUrl != null && !customLoginUrl.isBlank()
                ? requireHttpUrl(customLoginUrl, "Login link")
                : configUrl(loginUrl, DEFAULT_LOGIN, "app.mail.login-url");
        String instruction = "HOST".equalsIgnoreCase(role == null ? "" : role.trim())
                ? "Sign in and create your first assessment."
                : "Sign in and view your available assessments.";

        String body = p("Welcome to AssessMate, your smart examination platform.")
                + p("Your account has been created successfully. " + esc(instruction))
                + button(target, "Get started", null)
                + linkFallback(target)
                + pMuted("Keep your account credentials secure. AssessMate will never ask you for your password.");

        String text = plain("Welcome to AssessMate", greeting(name, "there"),
                "Welcome to AssessMate, your smart examination platform.\n"
                        + "Your account has been created successfully. " + instruction + "\n\n"
                        + "Sign in to get started:\n" + target + "\n\n"
                        + "Keep your account credentials secure. AssessMate will never ask you for your password.");
        return new EmailContent("Welcome to AssessMate",
                layout("Welcome to AssessMate", "Your AssessMate account is ready.", greeting(name, "there"), body), text);
    }

    // =====================================================================================================
    // 4. Host invitation
    // =====================================================================================================
    public EmailContent buildHostInvitationEmail(String name, String invitationUrl, String organizationName, int expiryMinutes) {
        String link = requireHttpUrl(invitationUrl, "Invitation link");
        String org = valueOrDefault(organizationName, "AssessMate");
        String body = p("You have been invited to join AssessMate as a Host by <strong>" + esc(org) + "</strong>.")
                + p("Use the button below to set up your account and start creating exams, managing question banks and monitoring candidate assessments.")
                + details("Invitation details", List.of(
                        Map.entry("Role", "Host (assessment creator)"),
                        Map.entry("Invited by", org),
                        Map.entry("Link expires in", expiryMinutes + " minutes")))
                + button(link, "Accept invitation", expiryMinutes)
                + linkFallback(link)
                + pMuted("This invitation link can only be used once. If you were not expecting it, you can safely ignore this email.");

        String text = plain("You're invited to AssessMate as a Host", greeting(name, "there"),
                "You have been invited to join AssessMate as a Host by " + org + ".\n"
                        + "Use the link below to set up your account:\n" + link + "\n\n"
                        + "This link expires in " + expiryMinutes + " minutes and can only be used once.\n\n"
                        + "If you were not expecting this invitation, you can safely ignore this email.");
        return new EmailContent("You've been invited to AssessMate as a Host",
                layout("You're invited to AssessMate as a Host", "Set up your AssessMate Host account.", greeting(name, "there"), body), text);
    }

    // =====================================================================================================
    // 5. Candidate invitation
    // =====================================================================================================
    public EmailContent buildCandidateInvitationEmail(String name, String invitationUrl, String organizationName, int expiryMinutes) {
        String link = requireHttpUrl(invitationUrl, "Invitation link");
        String org = valueOrDefault(organizationName, "AssessMate");
        String body = p("You have been invited to join AssessMate as a Candidate by <strong>" + esc(org) + "</strong>.")
                + p("Use the button below to open your candidate dashboard, take scheduled assessments and track your results.")
                + details("Candidate access", List.of(
                        Map.entry("Role", "Candidate"),
                        Map.entry("Institution / host", org),
                        Map.entry("Link expires in", expiryMinutes + " minutes")))
                + button(link, "Accept invitation", expiryMinutes)
                + linkFallback(link)
                + pMuted("This invitation is intended only for your account. If you were not expecting it, you can safely ignore this email.");

        String text = plain("You're invited to AssessMate", greeting(name, "Candidate"),
                "You have been invited to join AssessMate as a Candidate by " + org + ".\n"
                        + "Use the link below to accept your invitation:\n" + link + "\n\n"
                        + "This link expires in " + expiryMinutes + " minutes.\n\n"
                        + "If you were not expecting this invitation, you can safely ignore this email.");
        return new EmailContent("You've been invited to AssessMate",
                layout("You're invited to AssessMate", "Accept your invitation to AssessMate.", greeting(name, "Candidate"), body), text);
    }

    // =====================================================================================================
    // 6. Password changed
    // =====================================================================================================
    public EmailContent buildPasswordChangedNotificationEmail(String name, String accountEmail, String recoveryUrl) {
        String account = valueOrDefault(accountEmail, "your account");
        String recovery = recoveryUrl != null && !recoveryUrl.isBlank()
                ? requireHttpUrl(recoveryUrl, "Recovery link")
                : configUrl(resetUrl, DEFAULT_RESET, "app.mail.reset-url");
        String support = supportAddress();

        String body = p("Your AssessMate account password was changed.")
                + p("If you made this change, no further action is needed. For your security, you have been signed out of your other sessions.")
                + details("Security event", List.of(
                        Map.entry("Account", account),
                        Map.entry("Change", "Password updated"),
                        Map.entry("Other sessions", "Signed out")))
                + alertNote("Did not make this change?",
                        "Your account may be at risk. Reset your password right away or contact " + esc(support) + ".")
                + button(recovery, "Secure my account", null);

        String text = plain("Your password was changed", greeting(name, "there"),
                "Your AssessMate account password (" + account + ") was changed.\n\n"
                        + "If you made this change, no further action is needed. You have been signed out of your other sessions.\n\n"
                        + "If you did not make this change, reset your password right away:\n" + recovery + "\n\n"
                        + "Need help? Contact " + support + ".");
        return new EmailContent("Your AssessMate password was changed",
                layout("Your password was changed", "Your AssessMate password was just changed.", greeting(name, "there"), body), text);
    }

    // =====================================================================================================
    // Existing flows kept for backwards compatibility (same method signatures as before)
    // =====================================================================================================
    public EmailContent buildPasswordResetSuccessEmail(String name, String accountEmail) {
        return buildPasswordChangedNotificationEmail(name, accountEmail, configUrl(resetUrl, DEFAULT_RESET, "app.mail.reset-url"));
    }

    public EmailContent buildAdminInvitationEmail(String name, String setupUrl, int expiryMinutes) {
        String link = requireHttpUrl(setupUrl, "Setup link");
        String body = p("You have been invited to join the AssessMate administration team as a <strong>System Administrator</strong>.")
                + p("Administrators manage institutional exams, review proctoring activity, oversee user accounts and platform security.")
                + button(link, "Set up administrator password", expiryMinutes)
                + linkFallback(link)
                + pMuted("This invitation link can only be used once. If you were not expecting it, you can safely ignore this email.");
        String text = plain("Administrator invitation", greeting(name, "there"),
                "You have been invited to join AssessMate as a System Administrator.\n"
                        + "Set up your password and activate your account here:\n" + link + "\n\n"
                        + "This link expires in " + expiryMinutes + " minutes and can only be used once.\n\n"
                        + "If you were not expecting this invitation, you can safely ignore this email.");
        return new EmailContent("You've been invited as an Administrator on AssessMate",
                layout("Administrator invitation", "Set up your AssessMate administrator account.", greeting(name, "there"), body), text);
    }

    public EmailContent buildAdminInvitationResendEmail(String name, String setupUrl, int expiryMinutes) {
        String link = requireHttpUrl(setupUrl, "Setup link");
        String body = p("Your invitation to join AssessMate as a <strong>System Administrator</strong> has been re-issued. Any earlier invitation links no longer work.")
                + button(link, "Activate administrator account", expiryMinutes)
                + linkFallback(link)
                + pMuted("This link can only be used once.");
        String text = plain("Administrator invitation (resent)", greeting(name, "there"),
                "Your invitation to join AssessMate as a System Administrator has been re-issued:\n" + link + "\n\n"
                        + "This link expires in " + expiryMinutes + " minutes and can only be used once.");
        return new EmailContent("Your AssessMate Administrator invitation (resent)",
                layout("Administrator invitation (resent)", "Your administrator invitation link was refreshed.", greeting(name, "there"), body), text);
    }

    public EmailContent buildAdminAccountActivatedEmail(String name, String dashboardUrl) {
        String link = requireHttpUrl(dashboardUrl, "Dashboard link");
        String body = p("Your administrator account is set up and ready to use.")
                + details("Account", List.of(
                        Map.entry("Role", "System administrator"),
                        Map.entry("Status", "Active")))
                + button(link, "Open administrator dashboard", null)
                + pMuted("Keep your administrator credentials confidential. Never share them or your sign-in links.");
        String text = plain("Administrator account activated", greeting(name, "there"),
                "Your administrator account is set up and ready to use.\n\nSign in here:\n" + link);
        return new EmailContent("Administrator account activated - AssessMate",
                layout("Administrator account activated", "Your AssessMate administrator account is now active.", greeting(name, "there"), body), text);
    }

    public EmailContent buildExamInvitationEmail(String candidateName, String examTitle, String subjectName, String joinCode,
                                                 String scheduledStart, Integer durationMinutes, String deviceAccess, String joinUrl) {
        String title = valueOrDefault(examTitle, "Upcoming assessment");
        String subj = valueOrDefault(subjectName, "Examination");
        String code = joinCode == null ? "" : joinCode.trim();
        String start = valueOrDefault(scheduledStart, "To be announced");
        String duration = durationMinutes != null ? durationMinutes + " minutes" : "Standard duration";
        String device = deviceText(deviceAccess);
        String link = joinUrl != null && !joinUrl.isBlank() ? requireHttpUrl(joinUrl, "Join link") : "";

        String body = p("You have been registered for an upcoming proctored exam on AssessMate.")
                + details(title, List.of(
                        Map.entry("Subject", subj),
                        Map.entry("Starts", start),
                        Map.entry("Duration", duration),
                        Map.entry("Devices", device)))
                + pLabel("Your join code is:")
                + otpBox(esc(code), OtpLayout.BRANDED)
                + p("Enter this code in the AssessMate exam lobby to begin.")
                + (link.isEmpty() ? "" : button(link, "Open exam lobby", null))
                + pMuted("This exam uses live proctoring. Join from a quiet room with a working camera and microphone.");

        String text = plain("Exam invitation: " + title, greeting(candidateName, "Candidate"),
                "You have been registered for an upcoming proctored exam on AssessMate.\n\n"
                        + "Exam: " + title + "\nSubject: " + subj + "\nStarts: " + start + "\nDuration: " + duration + "\nDevices: " + device + "\n\n"
                        + "Your join code is:\n\n" + code + "\n\n"
                        + (link.isEmpty() ? "" : "Exam lobby: " + link + "\n\n")
                        + "Join from a quiet room with a working camera and microphone.");
        return new EmailContent("Exam invitation: " + oneLine(title),
                layout("You're invited to an exam", "You have been registered for an upcoming AssessMate exam.", greeting(candidateName, "Candidate"), body), text);
    }

    // =====================================================================================================
    // Shared layout
    // =====================================================================================================
    private static final String LAYOUT = """
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{{TITLE}}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style type="text/css">
body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
body { margin: 0; padding: 0; width: 100% !important; background-color: {{BG}}; }
@media only screen and (max-width: 620px) {
  .container { width: 100% !important; max-width: 100% !important; }
  .px { padding-left: 24px !important; padding-right: 24px !important; }
  .otp { font-size: 28px !important; letter-spacing: 4px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:{{BG}};">
<!-- canvas {{CANVAS}} -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{{BG}};opacity:0;">{{PREHEADER}}{{PAD}}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{{BG}}" style="background-color:{{BG}};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="{{CARD}}" style="width:600px;max-width:600px;background-color:{{CARD}};border:1px solid {{BORDER}};border-top:4px solid {{PRIMARY}};border-radius:8px;">
<tr><td class="px" align="left" style="padding:32px 40px 0 40px;">
<a href="{{SITE}}" target="_blank" style="text-decoration:none;color:{{INK}};">{{LOGO_ELEMENT}}</a>
</td></tr>
<tr><td class="px" style="padding:28px 40px 8px 40px;font-family:{{FONT}};">
<h1 style="margin:0 0 18px 0;font-family:{{FONT}};font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.2px;color:{{INK}};">{{HEADING}}</h1>
<p style="margin:0 0 16px 0;font-family:{{FONT}};font-size:15px;line-height:1.6;font-weight:600;color:{{INK}};">{{GREETING}}</p>
{{BODY}}
</td></tr>
<tr><td class="px" style="padding:8px 40px 32px 40px;font-family:{{FONT}};">
<p style="margin:0;padding-top:20px;border-top:1px solid {{BORDER}};font-size:14px;line-height:1.5;color:{{MUTED}};">Thanks,<br><strong style="color:{{INK}};">The AssessMate Team</strong></p>
</td></tr>
<tr><td class="px" align="center" bgcolor="{{BG}}" style="padding:22px 40px;background-color:{{BG}};border-top:1px solid {{BORDER}};font-family:{{FONT}};">
<p style="margin:0 0 6px 0;font-size:12px;line-height:1.5;color:{{MUTED}};"><a href="{{SITE}}" target="_blank" style="color:{{PRIMARY}};text-decoration:underline;">assessmate.me</a> &nbsp;|&nbsp; Need help? <a href="mailto:{{SUPPORT}}" style="color:{{PRIMARY}};text-decoration:underline;">{{SUPPORT}}</a></p>
<p style="margin:0 0 4px 0;font-size:11px;line-height:1.5;color:{{SUBTLE}};">You are receiving this email because of activity on your AssessMate account or an invitation sent to this address.</p>
<p style="margin:0;font-size:11px;line-height:1.5;color:{{LIGHT}};">&copy; {{YEAR}} AssessMate. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
""";

    private String layout(String heading, String preheader, String greeting, String bodyHtml) {
        String site = configUrl(websiteUrl, DEFAULT_SITE, "app.mail.website-url");
        String logo = configUrl(logoUrl, DEFAULT_LOGO, "app.mail.logo-url");
        int width = logoWidth >= 80 && logoWidth <= 320 ? logoWidth : 210;
        int height = Math.round(width * (float) LOGO_SOURCE_HEIGHT / LOGO_SOURCE_WIDTH);

        String logoHtml;
        if (logo.toLowerCase().contains("pwa") || logo.toLowerCase().contains("favicon") || logo.toLowerCase().contains("icon")) {
            // When pointing to square icon asset (e.g. pwa-512.png), render icon + text lockup
            logoHtml = """
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td valign="middle" style="padding-right:14px;">
                      <img src="%s" alt="AssessMate" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:11px;border:0;outline:none;text-decoration:none;">
                    </td>
                    <td valign="middle">
                      <span style="font-family:%s;font-size:26px;font-weight:800;letter-spacing:-0.4px;color:%s;line-height:1;text-decoration:none;display:inline-block;">AssessMate</span>
                    </td>
                  </tr>
                </table>
                """.formatted(esc(logo), FONT, COLOR_INK_HEADING);
        } else {
            // When pointing to full horizontal rectangular logo image (e.g. logo.png, 319x80)
            logoHtml = "<img src=\"" + esc(logo) + "\" alt=\"AssessMate\" width=\"" + width + "\" height=\"" + height
                    + "\" style=\"display:block;width:" + width + "px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;font-family:"
                    + FONT + ";font-size:22px;font-weight:700;color:" + COLOR_INK_HEADING + ";\">";
        }

        Map<String, String> v = new LinkedHashMap<>();
        v.put("TITLE", esc(heading));
        v.put("BG", COLOR_BG_EMAIL);
        v.put("CANVAS", COLOR_BG_CANVAS);
        v.put("CARD", COLOR_BG_CONTENT);
        v.put("BORDER", COLOR_BORDER);
        v.put("PRIMARY", COLOR_BRAND_PRIMARY);
        v.put("INK", COLOR_INK_HEADING);
        v.put("MUTED", COLOR_INK_MUTED);
        v.put("SUBTLE", COLOR_INK_SUBTLE);
        v.put("LIGHT", COLOR_INK_LIGHT);
        v.put("FONT", FONT);
        v.put("PREHEADER", esc(preheader));
        v.put("PAD", "&nbsp;&zwnj;".repeat(30));
        v.put("SITE", esc(site));
        v.put("LOGO_ELEMENT", logoHtml);
        v.put("HEADING", esc(heading));
        v.put("GREETING", esc(greeting));
        v.put("BODY", bodyHtml);
        v.put("SUPPORT", esc(supportAddress()));
        v.put("YEAR", String.valueOf(Year.now().getValue()));
        return render(LAYOUT, v);
    }

    // ---- Components ------------------------------------------------------------------------------------
    private String p(String html) {
        return "<p style=\"margin:0 0 16px 0;font-family:" + FONT + ";font-size:15px;line-height:1.6;color:" + COLOR_INK_BODY + ";\">" + html + "</p>\n";
    }

    private String pMuted(String html) {
        return "<p style=\"margin:16px 0 0 0;font-family:" + FONT + ";font-size:13px;line-height:1.6;color:" + COLOR_INK_MUTED + ";\">" + html + "</p>\n";
    }

    private String pLabel(String html) {
        return "<p style=\"margin:0 0 8px 0;font-family:" + FONT + ";font-size:15px;line-height:1.5;font-weight:600;color:" + COLOR_INK_HEADING + ";\">" + html + "</p>\n";
    }

    /**
     * The code sits alone in its own table cell, as plain uninterrupted text. Styling is on the cell only;
     * letter-spacing is CSS so the underlying text stays one value ("123456", not "1 2 3 4 5 6").
     */
    private String otpBox(String safeCode, OtpLayout layout) {
        if (layout == OtpLayout.MINIMAL) {
            return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 20px 0;\"><tr>"
                    + "<td align=\"center\" bgcolor=\"" + COLOR_BG_EMAIL + "\" style=\"background-color:" + COLOR_BG_EMAIL + ";border-radius:6px;padding:14px 12px;font-family:" + FONT
                    + ";font-size:28px;font-weight:700;line-height:1.2;color:" + COLOR_INK_HEADING + ";user-select:all;-webkit-user-select:all;cursor:pointer;\">" + safeCode + "</td></tr></table>\n";
        }
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 20px 0;\"><tr>"
                + "<td class=\"otp\" align=\"center\" bgcolor=\"" + COLOR_BRAND_LIGHT + "\" style=\"background-color:" + COLOR_BRAND_LIGHT + ";border:1px solid " + COLOR_BRAND_BORDER
                + ";border-radius:8px;padding:18px 12px;font-family:" + MONO + ";font-size:34px;font-weight:700;letter-spacing:6px;line-height:1.2;color:" + COLOR_INK_HEADING + ";user-select:all;-webkit-user-select:all;cursor:pointer;\">"
                + safeCode + "</td></tr></table>\n";
    }

    private String button(String url, String text, Integer expiryMinutes) {
        String u = esc(url);
        String t = esc(text);
        String expiry = expiryMinutes != null
                ? "<p style=\"margin:10px 0 0 0;font-family:" + FONT + ";font-size:12px;color:" + COLOR_INK_MUTED + ";text-align:center;\">This link expires in " + expiryMinutes + " minutes.</p>"
                : "";
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:24px 0 8px 0;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td align=\"center\" bgcolor=\"" + COLOR_BRAND_PRIMARY + "\" style=\"border-radius:8px;background-color:" + COLOR_BRAND_PRIMARY + ";\">"
                + "<!--[if mso]><v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:w=\"urn:schemas-microsoft-com:office:word\" href=\"" + u + "\" style=\"height:48px;v-text-anchor:middle;width:240px;\" arcsize=\"17%\" stroke=\"f\" fillcolor=\"" + COLOR_BRAND_PRIMARY + "\"><w:anchorlock/><center style=\"color:#FFFFFF;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;\">" + t + "</center></v:roundrect><![endif]-->"
                + "<!--[if !mso]><!--><a href=\"" + u + "\" target=\"_blank\" style=\"display:inline-block;padding:14px 32px;border-radius:8px;border:1px solid " + COLOR_BRAND_DARK + ";background-color:" + COLOR_BRAND_PRIMARY
                + ";font-family:" + FONT + ";font-size:15px;font-weight:600;line-height:1.2;color:#FFFFFF;text-decoration:none;\">" + t + "</a><!--<![endif]-->"
                + "</td></tr></table>" + expiry + "</td></tr></table>\n";
    }

    private String linkFallback(String url) {
        String u = esc(url);
        return "<p style=\"margin:16px 0 4px 0;font-family:" + FONT + ";font-size:12px;line-height:1.5;color:" + COLOR_INK_MUTED + ";\">If the button does not work, copy and paste this link into your browser:</p>"
                + "<p style=\"margin:0 0 8px 0;font-family:" + FONT + ";font-size:12px;line-height:1.5;word-break:break-all;\"><a href=\"" + u + "\" style=\"color:" + COLOR_BRAND_PRIMARY + ";text-decoration:underline;\">" + u + "</a></p>\n";
    }

    private String details(String title, List<Map.Entry<String, String>> rows) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> r : rows) {
            sb.append("<tr><td valign=\"top\" style=\"padding:4px 0;width:38%;font-family:").append(FONT).append(";font-size:13px;color:").append(COLOR_INK_MUTED).append(";\">")
              .append(esc(r.getKey())).append("</td><td valign=\"top\" style=\"padding:4px 0;font-family:").append(FONT).append(";font-size:13px;font-weight:600;color:")
              .append(COLOR_INK_HEADING).append(";\">").append(esc(r.getValue())).append("</td></tr>");
        }
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"" + COLOR_BG_EMAIL + "\" style=\"margin:8px 0 20px 0;background-color:" + COLOR_BG_EMAIL
                + ";border:1px solid " + COLOR_BORDER + ";border-radius:8px;\"><tr><td style=\"padding:16px 20px;\">"
                + "<p style=\"margin:0 0 8px 0;font-family:" + FONT + ";font-size:14px;font-weight:700;color:" + COLOR_INK_HEADING + ";\">" + esc(title) + "</p>"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">" + sb + "</table></td></tr></table>\n";
    }

    private String alertNote(String title, String safeHtml) {
        return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"" + COLOR_ACCENT_BG + "\" style=\"margin:8px 0 8px 0;background-color:" + COLOR_ACCENT_BG
                + ";border-left:4px solid " + COLOR_ACCENT_ALERT + ";\"><tr><td style=\"padding:14px 16px;\">"
                + "<p style=\"margin:0 0 4px 0;font-family:" + FONT + ";font-size:14px;font-weight:700;color:" + COLOR_ACCENT_TITLE + ";\">" + esc(title) + "</p>"
                + "<p style=\"margin:0;font-family:" + FONT + ";font-size:13px;line-height:1.5;color:" + COLOR_ACCENT_TEXT + ";\">" + safeHtml + "</p></td></tr></table>\n";
    }

    // ---- Plain text ------------------------------------------------------------------------------------
    private String plain(String heading, String greeting, String body) {
        return "AssessMate\n\n" + heading + "\n\n" + greeting + "\n\n" + body + "\n\nThanks,\nThe AssessMate Team\n"
                + configUrl(websiteUrl, DEFAULT_SITE, "app.mail.website-url") + "\n";
    }

    // ---- Helpers ---------------------------------------------------------------------------------------
    private static final Pattern TOKEN = Pattern.compile("\\{\\{([A-Z_]+)}}");

    /** Single-pass substitution so dynamic values are never re-scanned for template tokens. */
    private static String render(String template, Map<String, String> values) {
        Matcher m = TOKEN.matcher(template);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            String v = values.get(m.group(1));
            m.appendReplacement(out, Matcher.quoteReplacement(v != null ? v : m.group(0)));
        }
        m.appendTail(out);
        return out.toString();
    }

    private static String esc(String s) {
        return HtmlUtils.htmlEscape(s == null ? "" : s);
    }

    /** One trimmed line: no CR/LF (prevents header injection in subjects) and collapsed spaces. */
    private static String oneLine(String s) {
        return s == null ? "" : s.replaceAll("[\\r\\n\\t]+", " ").replaceAll(" {2,}", " ").trim();
    }

    private static String valueOrDefault(String value, String fallback) {
        String v = oneLine(value);
        return v.isEmpty() ? fallback : v;
    }

    private static String greeting(String name, String fallback) {
        return "Hello " + valueOrDefault(name, fallback) + ",";
    }

    private String supportAddress() {
        String s = oneLine(supportEmail);
        return s.matches("[^\\s@<>\"]+@[^\\s@<>\"]+") ? s : DEFAULT_SUPPORT;
    }

    private static String deviceText(String access) {
        String a = access == null ? "" : access.trim().toUpperCase(Locale.ROOT);
        if (a.equals("DESKTOP") || a.equals("DESKTOP_ONLY")) return "Desktop or laptop with webcam and microphone";
        if (a.equals("MOBILE") || a.equals("MOBILE_ONLY")) return "Mobile phone or tablet";
        return "Desktop or mobile";
    }

    /** Link supplied by server code (invitation, reset, dashboard). Must be http(s); never echoed in errors. */
    private static String requireHttpUrl(String url, String what) {
        String u = url == null ? "" : url.trim();
        if (!isHttpUrl(u)) {
            throw new IllegalArgumentException(what + " must be an absolute http(s) URL");
        }
        return u;
    }

    /** Configured link: falls back to the default when invalid, and warns about localhost. */
    private String configUrl(String value, String fallback, String property) {
        String u = value == null ? "" : value.trim();
        if (!isHttpUrl(u)) {
            log.warn("Invalid email link configured in {}; using the default", property);
            return fallback;
        }
        String host = URI.create(u).getHost();
        if (host != null && (host.equalsIgnoreCase("localhost") || host.equals("127.0.0.1"))) {
            log.warn("{} points at {}; recipients cannot open it. Use the public https URL in production", property, host);
        }
        return u;
    }

    private static boolean isHttpUrl(String u) {
        if (u == null || u.isEmpty() || u.length() > 2048 || u.matches(".*[\\s\\p{Cntrl}<>\"].*")) return false;
        try {
            URI uri = URI.create(u);
            String scheme = uri.getScheme();
            return scheme != null && (scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))
                    && uri.getHost() != null && !uri.getHost().isEmpty();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
