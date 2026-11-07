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
 *
 * Outgoing structure is the simplest standards-compliant one:
 *   multipart/alternative
 *     text/plain  (first)
 *     text/html   (last, preferred by clients)
 * The logo is a normal https image inside the HTML (no CID attachment, no multipart/related, no base64).
 * Falls back to plain text if MIME is unavailable.
 */
@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private EmailTemplateService emailTemplateService = new EmailTemplateService();

    @Value("${app.mail.from:mail@assessmate.me}")
    private String fromAddress;

    @Value("${app.mail.sender-name:AssessMate}")
    private String senderName;

    /** Replies go to support (defaults to app.mail.support-email). */
    @Value("${app.mail.reply-to:${app.mail.support-email:mail@assessmate.me}}")
    private String replyTo;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public EmailService(JavaMailSender mailSender) {
        this(mailSender, new EmailTemplateService());
    }

    @Autowired
    public EmailService(JavaMailSender mailSender, EmailTemplateService emailTemplateService) {
        this.mailSender = mailSender;
        this.emailTemplateService = emailTemplateService != null ? emailTemplateService : new EmailTemplateService();
    }

    public void setEmailTemplateService(EmailTemplateService emailTemplateService) {
        if (emailTemplateService != null) {
            this.emailTemplateService = emailTemplateService;
        }
    }

    public boolean isMailConfigured() {
        return mailUsername != null && !mailUsername.trim().isEmpty() &&
               mailPassword != null && !mailPassword.trim().isEmpty();
    }

    // -------------------------------------------------------------------------
    // Transactional email methods (signatures unchanged)
    // -------------------------------------------------------------------------

    public void sendRegistrationOtp(String toEmail, String name, String otp) {
        send(toEmail, emailTemplateService.buildRegistrationOtpEmail(name, otp, otpExpiryMinutes));
    }

    public void sendConfirmationCodeEmail(String toEmail, String name, String otp) {
        send(toEmail, emailTemplateService.buildConfirmationCodeEmail(name, otp, otpExpiryMinutes));
    }

    public void sendPasswordResetOtp(String toEmail, String otp) {
        send(toEmail, emailTemplateService.buildPasswordResetOtpEmail(otp, otpExpiryMinutes));
    }

    public boolean sendPasswordResetEmail(String toEmail, String name, String resetUrl, int expiryMinutes) {
        return send(toEmail, emailTemplateService.buildPasswordResetEmail(name, resetUrl, expiryMinutes));
    }

    public boolean sendWelcomeEmail(String toEmail, String name, String role) {
        return send(toEmail, emailTemplateService.buildWelcomeEmail(name, role, null));
    }

    public boolean sendHostInvitation(String toEmail, String name, String invitationUrl, String organizationName, int expiryMinutes) {
        return send(toEmail, emailTemplateService.buildHostInvitationEmail(name, invitationUrl, organizationName, expiryMinutes));
    }

    public boolean sendCandidateInvitation(String toEmail, String name, String invitationUrl, String organizationName, int expiryMinutes) {
        return send(toEmail, emailTemplateService.buildCandidateInvitationEmail(name, invitationUrl, organizationName, expiryMinutes));
    }

    public boolean sendPasswordChangedNotification(String toEmail, String name) {
        return send(toEmail, emailTemplateService.buildPasswordChangedNotificationEmail(name, toEmail, null));
    }

    public boolean sendPasswordResetSuccessNotification(String toEmail, String name) {
        return send(toEmail, emailTemplateService.buildPasswordResetSuccessEmail(name, toEmail));
    }

    public boolean sendAdminInvitation(String toEmail, String name, String setupUrl) {
        return send(toEmail, emailTemplateService.buildAdminInvitationEmail(name, setupUrl, 30));
    }

    public boolean sendAdminInvitationResend(String toEmail, String name, String setupUrl) {
        return send(toEmail, emailTemplateService.buildAdminInvitationResendEmail(name, setupUrl, 30));
    }

    public boolean sendAdminAccountActivated(String toEmail, String name, String dashboardUrl) {
        return send(toEmail, emailTemplateService.buildAdminAccountActivatedEmail(name, dashboardUrl));
    }

    public boolean sendExamInvitation(
            String toEmail, String candidateName, String examTitle, String subject, String joinCode,
            String scheduledStart, Integer durationMinutes, String deviceAccess, String joinUrl
    ) {
        return send(toEmail, emailTemplateService.buildExamInvitationEmail(
                candidateName, examTitle, subject, joinCode, scheduledStart, durationMinutes, deviceAccess, joinUrl));
    }

    /** Package-private: used only by the mail-test profile runner to send pre-built content. */
    boolean sendContent(String toEmail, EmailContent content) {
        return send(toEmail, content);
    }

    // -------------------------------------------------------------------------
    // Core dispatch
    // -------------------------------------------------------------------------

    private boolean send(String toEmail, EmailContent content) {
        // Content (codes, links, tokens) is never logged.
        log.info("Email dispatch: To={}, Subject='{}' (content redacted)", toEmail, content.getSubject());
        try {
            MimeMessage mimeMessage = mailSender != null ? mailSender.createMimeMessage() : null;
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
            } else if (mailSender != null) {
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
            } else {
                log.warn("Cannot dispatch email to {}: JavaMailSender is null", toEmail);
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to send email to {}: Subject='{}', error={}", toEmail, content.getSubject(), e.getMessage());
            return false;
        }
    }
}
