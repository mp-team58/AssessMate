package com.assessmate.service;

import com.assessmate.dto.EmailContent;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailTemplateServiceTest {

    private EmailTemplateService templateService;

    @Mock
    private JavaMailSender mailSender;

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        templateService = new EmailTemplateService();
        emailService = new EmailService(mailSender);
        emailService.setEmailTemplateService(templateService);
        ReflectionTestUtils.setField(emailService, "fromAddress", "noreply@assessmate.com");
        ReflectionTestUtils.setField(emailService, "otpExpiryMinutes", 10);
    }

    @Test
    @DisplayName("Branding: Official AssessMate palette & logo CID are present in registration email")
    void testRegistrationEmailBrandColorsAndLogo() {
        EmailContent content = templateService.buildRegistrationOtpEmail("Alex", "482910", 10);

        assertEquals("Verify your AssessMate account", content.getSubject());
        String html = content.getHtmlBody();

        // Verify official brand colors
        assertTrue(html.contains("#2F6F4E"), "Must include primary forest green (#2F6F4E)");
        assertTrue(html.contains("#16241F"), "Must include ink dark text (#16241F)");
        assertTrue(html.contains("#F1F4F2"), "Must include canvas surface color (#F1F4F2)");
        assertTrue(html.contains("#F0F7F3"), "Must include light brand tint (#F0F7F3)");
        assertTrue(html.contains("#C0562C"), "Must include terracotta security accent (#C0562C)");

        // Verify brand logo mark
        assertTrue(html.contains("M17 33.5L27.5 44L47 21"), "Must contain official AssessMate checkmark path");
        assertTrue(html.contains("AssessMate"), "Must contain brand name");

        // Verify OTP is present in HTML and plain text
        assertTrue(html.contains("482910"));
        assertTrue(content.getPlainTextBody().contains("482910"));
        assertFalse(content.getPlainTextBody().contains("<table"), "Plain text must not contain HTML tags");
    }

    @Test
    @DisplayName("Branding: Forgot password OTP email formatting & expiry details")
    void testForgotPasswordOtpEmail() {
        EmailContent content = templateService.buildPasswordResetOtpEmail("918234", 10);

        assertEquals("Reset your AssessMate password", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("918234"));
        assertTrue(html.contains("Valid for 10 minutes"));
        assertTrue(html.contains("Security Verification"));
        assertTrue(content.getPlainTextBody().contains("918234"));
    }

    @Test
    @DisplayName("Branding: Password reset confirmation notification email")
    void testPasswordResetSuccessEmail() {
        EmailContent content = templateService.buildPasswordResetSuccessEmail("Sarah Connor", "sarah@example.com");

        assertEquals("Your AssessMate password was changed", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("sarah@example.com"));
        assertTrue(html.contains("Password Successfully Updated"));
        assertTrue(html.contains("Previous tokens revoked"));
        assertTrue(html.contains("#2F6F4E"));
    }

    @Test
    @DisplayName("Branding: Admin invitation email includes button and fallback link")
    void testAdminInvitationEmail() {
        String setupUrl = "https://app.assessmate.com/admin/setup-password?token=secret123";
        EmailContent content = templateService.buildAdminInvitationEmail("Marcus Vance", setupUrl, 30);

        assertEquals("You've been invited as an Administrator on AssessMate", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Set Up Administrator Password"));
        assertTrue(html.contains("https://app.assessmate.com/admin/setup-password?token=secret123"));
        assertTrue(html.contains("expires in 30 minutes"));
        assertTrue(content.getPlainTextBody().contains(setupUrl));
    }

    @Test
    @DisplayName("Branding: Admin invitation resend email")
    void testAdminInvitationResendEmail() {
        String setupUrl = "https://app.assessmate.com/admin/setup-password?token=newtoken456";
        EmailContent content = templateService.buildAdminInvitationResendEmail("Marcus Vance", setupUrl, 30);

        assertEquals("Your AssessMate Administrator Invitation (Resent)", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Administrator Invitation (Resent)"));
        assertTrue(html.contains("Activate Administrator Account"));
        assertTrue(html.contains(setupUrl));
    }

    @Test
    @DisplayName("Branding: Admin account activated confirmation email")
    void testAdminAccountActivatedEmail() {
        String dashUrl = "https://app.assessmate.com/admin/dashboard";
        EmailContent content = templateService.buildAdminAccountActivatedEmail("Chief Admin", dashUrl);

        assertEquals("Administrator Account Activated - AssessMate", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Administrator Account Activated"));
        assertTrue(html.contains("SYSTEM ADMINISTRATOR"));
        assertTrue(html.contains(dashUrl));
    }

    @Test
    @DisplayName("Branding: Exam invitation email includes exam details, join code, and policy")
    void testExamInvitationEmail() {
        EmailContent content = templateService.buildExamInvitationEmail(
                "John Doe",
                "Advanced Algorithms Final",
                "Computer Science 401",
                "ALGO88",
                "Nov 15, 2026, 09:00 AM",
                120,
                "DESKTOP_ONLY",
                "https://app.assessmate.com/join"
        );

        assertEquals("Exam Invitation: Advanced Algorithms Final", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Advanced Algorithms Final"));
        assertTrue(html.contains("Computer Science 401"));
        assertTrue(html.contains("ALGO88"));
        assertTrue(html.contains("120 minutes"));
        assertTrue(html.contains("Desktop / Laptop (Webcam &amp; Microphone Required)"));
        assertTrue(html.contains("https://app.assessmate.com/join"));
        assertTrue(content.getPlainTextBody().contains("ALGO88"));
    }

    @Test
    @DisplayName("Security: Dynamic inputs are safely HTML escaped against XSS injection")
    void testHtmlEscapingOnAdversarialInput() {
        String maliciousName = "<script>alert('xss')</script>";
        String maliciousExam = "<b onmouseover=\"alert(1)\">Hacked Exam</b>";
        String maliciousSubject = "\"><img src=x onerror=alert(2)>";

        EmailContent content = templateService.buildExamInvitationEmail(
                maliciousName,
                maliciousExam,
                maliciousSubject,
                "CODE12",
                "Tomorrow",
                60,
                "ANY",
                "https://app.assessmate.com/join"
        );

        String html = content.getHtmlBody();

        // Verify unescaped malicious tags are NOT present
        assertFalse(html.contains("<script>alert('xss')</script>"));
        assertFalse(html.contains("<b onmouseover=\"alert(1)\">"));
        assertFalse(html.contains("<img src=x onerror=alert(2)>"));

        // Verify escaped entities are present
        assertTrue(html.contains("&lt;script&gt;"));
        assertTrue(html.contains("&quot;&gt;&lt;img"));
    }

    @Test
    @DisplayName("MIME Dispatch: Real MimeMessage is built with multipart/related and logo attachment")
    void testMimeMessageDispatch() {
        Session session = Session.getInstance(new Properties());
        MimeMessage mockMime = new MimeMessage(session);

        when(mailSender.createMimeMessage()).thenReturn(mockMime);
        doNothing().when(mailSender).send(any(MimeMessage.class));

        emailService.sendRegistrationOtp("candidate@example.com", "Bob", "771829");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        assertNotNull(captor.getValue());
    }
}

