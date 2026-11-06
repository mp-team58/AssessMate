package com.assessmate.service;

import com.assessmate.dto.EmailContent;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Service responsible for dispatching official AssessMate transactional emails.
 * Supports multi-part MIME (responsive branded HTML + plain text fallback + inline CID logo)
 * and falls back safely to plain-text dispatch if MIME is unavailable.
 */
@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private EmailTemplateService emailTemplateService = new EmailTemplateService();

    @Value("${app.mail.from:noreply@assessmate.com}")
    private String fromAddress;

    @Value("${app.otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Autowired(required = false)
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
    // Transactional Email Dispatch Methods
    // -------------------------------------------------------------------------

    public void sendRegistrationOtp(String toEmail, String name, String otp) {
        EmailContent content = emailTemplateService.buildRegistrationOtpEmail(name, otp, otpExpiryMinutes);
        send(toEmail, content);
    }

    public void sendPasswordResetOtp(String toEmail, String otp) {
        EmailContent content = emailTemplateService.buildPasswordResetOtpEmail(otp, otpExpiryMinutes);
        send(toEmail, content);
    }

    public boolean sendPasswordResetSuccessNotification(String toEmail, String name) {
        EmailContent content = emailTemplateService.buildPasswordResetSuccessEmail(name, toEmail);
        return send(toEmail, content);
    }

    public boolean sendAdminInvitation(String toEmail, String name, String setupUrl) {
        EmailContent content = emailTemplateService.buildAdminInvitationEmail(name, setupUrl, 30);
        return send(toEmail, content);
    }

    public boolean sendAdminInvitationResend(String toEmail, String name, String setupUrl) {
        EmailContent content = emailTemplateService.buildAdminInvitationResendEmail(name, setupUrl, 30);
        return send(toEmail, content);
    }

    public boolean sendAdminAccountActivated(String toEmail, String name, String dashboardUrl) {
        EmailContent content = emailTemplateService.buildAdminAccountActivatedEmail(name, dashboardUrl);
        return send(toEmail, content);
    }

    public boolean sendExamInvitation(
            String toEmail,
            String candidateName,
            String examTitle,
            String subject,
            String joinCode,
            String scheduledStart,
            Integer durationMinutes,
            String deviceAccess,
            String joinUrl
    ) {
        EmailContent content = emailTemplateService.buildExamInvitationEmail(
                candidateName,
                examTitle,
                subject,
                joinCode,
                scheduledStart,
                durationMinutes,
                deviceAccess,
                joinUrl
        );
        return send(toEmail, content);
    }

    // -------------------------------------------------------------------------
    // Core Email Dispatch Pipeline
    // -------------------------------------------------------------------------

    private boolean send(String toEmail, EmailContent content) {
        log.info("Email dispatch: To={}, Subject='{}' (content redacted)", toEmail, content.getSubject());
        try {
            MimeMessage mimeMessage = mailSender != null ? mailSender.createMimeMessage() : null;
            if (mimeMessage != null) {
                MimeMessageHelper helper = new MimeMessageHelper(
                        mimeMessage,
                        true,
                        StandardCharsets.UTF_8.name()
                );
                helper.setFrom(fromAddress);
                helper.setTo(toEmail);
                helper.setSubject(content.getSubject());
                helper.setText(content.getPlainTextBody(), content.getHtmlBody());

                mailSender.send(mimeMessage);
                return true;
            } else if (mailSender != null) {
                // Fallback for mock environments or plain senders without MIME support
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromAddress);
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
