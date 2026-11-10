package com.assessmate.service;

import com.assessmate.dto.EmailContent;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Dispatches AssessMate transactional emails.
 * Primary delivery is handled via Brevo's REST API over HTTPS (port 443),
 * completely bypassing outbound SMTP port restrictions on hosting platforms like Render Free.
 *
 * If Brevo REST API is not configured (e.g., in unit tests), it falls back to JavaMailSender.
 */
@Service
@Slf4j
public class EmailService {

    private final BrevoEmailService brevoEmailService;
    private final JavaMailSender mailSender;
    private EmailTemplateService emailTemplateService;

    @Value("${app.mail.from:mail@assessmate.me}")
    private String fromAddress = "mail@assessmate.me";

    @Value("${app.mail.sender-name:AssessMate}")
    private String senderName = "AssessMate";

    /** Replies go to support (defaults to app.mail.support-email). */
    @Value("${app.mail.reply-to:${app.mail.support-email:mail@assessmate.me}}")
    private String replyTo = "mail@assessmate.me";

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes = 10;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public EmailService() {
        this(new BrevoEmailService(), null, new EmailTemplateService());
    }

    public EmailService(JavaMailSender mailSender) {
        this(new BrevoEmailService(), mailSender, new EmailTemplateService());
    }

    public EmailService(JavaMailSender mailSender, EmailTemplateService emailTemplateService) {
        this(new BrevoEmailService(), mailSender, emailTemplateService);
    }

    @Autowired
    public EmailService(
            @Autowired(required = false) BrevoEmailService brevoEmailService,
            @Autowired(required = false) JavaMailSender mailSender,
            @Autowired(required = false) EmailTemplateService emailTemplateService) {
        this.brevoEmailService = brevoEmailService != null ? brevoEmailService : new BrevoEmailService();
        this.mailSender = mailSender;
        this.emailTemplateService = emailTemplateService != null ? emailTemplateService : new EmailTemplateService();
    }

    public void setEmailTemplateService(EmailTemplateService emailTemplateService) {
        if (emailTemplateService != null) {
            this.emailTemplateService = emailTemplateService;
        }
    }

    public boolean isMailConfigured() {
        return (brevoEmailService != null && brevoEmailService.isConfigured()) ||
               (mailUsername != null && !mailUsername.trim().isEmpty() &&
                mailPassword != null && !mailPassword.trim().isEmpty());
    }

    // -------------------------------------------------------------------------
    // Transactional email methods (signatures unchanged)
    // -------------------------------------------------------------------------

    public void sendRegistrationOtp(String toEmail, String name, String otp) {
        send(toEmail, name, emailTemplateService.buildRegistrationOtpEmail(name, otp, otpExpiryMinutes));
    }

    public void sendConfirmationCodeEmail(String toEmail, String name, String otp) {
        send(toEmail, name, emailTemplateService.buildConfirmationCodeEmail(name, otp, otpExpiryMinutes));
    }

    public void sendPasswordResetOtp(String toEmail, String otp) {
        send(toEmail, null, emailTemplateService.buildPasswordResetOtpEmail(otp, otpExpiryMinutes));
    }

    public boolean sendPasswordResetEmail(String toEmail, String name, String resetUrl, int expiryMinutes) {
        return send(toEmail, name, emailTemplateService.buildPasswordResetEmail(name, resetUrl, expiryMinutes));
    }

    public boolean sendWelcomeEmail(String toEmail, String name, String role) {
        return send(toEmail, name, emailTemplateService.buildWelcomeEmail(name, role, null));
    }

    public boolean sendHostInvitation(String toEmail, String name, String invitationUrl, String organizationName, int expiryMinutes) {
        return send(toEmail, name, emailTemplateService.buildHostInvitationEmail(name, invitationUrl, organizationName, expiryMinutes));
    }

    public boolean sendCandidateInvitation(String toEmail, String name, String invitationUrl, String organizationName, int expiryMinutes) {
        return send(toEmail, name, emailTemplateService.buildCandidateInvitationEmail(name, invitationUrl, organizationName, expiryMinutes));
    }

    public boolean sendPasswordChangedNotification(String toEmail, String name) {
        return send(toEmail, name, emailTemplateService.buildPasswordChangedNotificationEmail(name, toEmail, null));
    }

    public boolean sendPasswordResetSuccessNotification(String toEmail, String name) {
        return send(toEmail, name, emailTemplateService.buildPasswordResetSuccessEmail(name, toEmail));
    }

    public boolean sendAdminInvitation(String toEmail, String name, String setupUrl) {
        return send(toEmail, name, emailTemplateService.buildAdminInvitationEmail(name, setupUrl, 30));
    }

    public boolean sendAdminInvitationResend(String toEmail, String name, String setupUrl) {
        return send(toEmail, name, emailTemplateService.buildAdminInvitationResendEmail(name, setupUrl, 30));
    }

    public boolean sendAdminAccountActivated(String toEmail, String name, String dashboardUrl) {
        return send(toEmail, name, emailTemplateService.buildAdminAccountActivatedEmail(name, dashboardUrl));
    }

    public boolean sendExamInvitation(
            String toEmail, String candidateName, String examTitle, String subject, String joinCode,
            String scheduledStart, Integer durationMinutes, String deviceAccess, String joinUrl
    ) {
        return send(toEmail, candidateName, emailTemplateService.buildExamInvitationEmail(
                candidateName, examTitle, subject, joinCode, scheduledStart, durationMinutes, deviceAccess, joinUrl));
    }

    /** Package-private: used only by the mail-test profile runner to send pre-built content. */
    boolean sendContent(String toEmail, EmailContent content) {
        return send(toEmail, null, content);
    }

    // -------------------------------------------------------------------------
    // Core dispatch
    // -------------------------------------------------------------------------

    private boolean send(String toEmail, String toName, EmailContent content) {
        // Content (codes, links, tokens) is never logged.
        log.info("Email dispatch: To={}, Subject='{}' (content redacted)", toEmail, content.getSubject());

        // 1. Primary delivery: Brevo REST API over HTTPS (port 443)
        if (brevoEmailService != null && brevoEmailService.isConfigured()) {
            return brevoEmailService.sendEmail(
                    toEmail,
                    toName,
                    content.getSubject(),
                    content.getHtmlBody(),
                    content.getPlainTextBody()
            );
        }

        // 2. Fallback delivery: JavaMailSender (if configured and Brevo REST API key is absent)
        if (mailSender != null) {
            return sendViaJavaMailSender(toEmail, toName, content);
        }

        log.warn("Cannot dispatch email to {}: neither Brevo API nor JavaMailSender is configured", toEmail);
        return false;
    }

    private boolean sendViaJavaMailSender(String toEmail, String toName, EmailContent content) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            if (mimeMessage != null) {
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, StandardCharsets.UTF_8.name());
                if (senderName != null && !senderName.trim().isEmpty()) {
                    helper.setFrom(fromAddress, senderName.trim());
                } else {
                    helper.setFrom(fromAddress);
                }
                if (replyTo != null && replyTo.matches("[^\\s@<>\"]+@[^\\s@<>\"]+")) {
                    helper.setReplyTo(replyTo.trim());
                }
                helper.setTo(toEmail);
                helper.setSubject(content.getSubject());

                // RFC 2046: parts are ordered least to most preferred, so plain text first, HTML last.
                MimeMultipart multipart = new MimeMultipart("alternative");

                MimeBodyPart textPart = new MimeBodyPart();
                textPart.setText(content.getPlainTextBody(), StandardCharsets.UTF_8.name(), "plain");

                MimeBodyPart htmlPart = new MimeBodyPart();
                htmlPart.setContent(content.getHtmlBody(), "text/html; charset=UTF-8");

                multipart.addBodyPart(textPart);
                multipart.addBodyPart(htmlPart);
                mimeMessage.setContent(multipart);

                mailSender.send(mimeMessage);
                return true;
            } else {
                // Fallback for plain senders without MIME support
                SimpleMailMessage message = new SimpleMailMessage();
                if (senderName != null && !senderName.trim().isEmpty()) {
                    message.setFrom(String.format("%s <%s>", senderName.trim(), fromAddress));
                } else {
                    message.setFrom(fromAddress);
                }
                message.setTo(toEmail);
                message.setSubject(content.getSubject());
                message.setText(content.getPlainTextBody());
                mailSender.send(message);
                return true;
            }
        } catch (Exception e) {
            log.error("Failed to send email via SMTP to {}: Subject='{}', error={}", toEmail, content.getSubject(), e.getMessage());
            return false;
        }
    }
}
