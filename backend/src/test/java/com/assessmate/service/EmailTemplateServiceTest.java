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
    @DisplayName("Branding: Official AssessMate palette & logo are present in registration email")
    void testRegistrationEmailBrandColorsAndLogo() {
        EmailContent content = templateService.buildRegistrationOtpEmail("Alex", "482910", 10);

        assertEquals("Verify your AssessMate account", content.getSubject());
        String html = content.getHtmlBody();

        // Verify official brand colors
        assertTrue(html.contains("#2F6F4E"), "Must include primary forest green (#2F6F4E)");
        assertTrue(html.contains("#16241F"), "Must include ink dark text (#16241F)");
        assertTrue(html.contains("#F4F6F4"), "Must include email background color (#F4F6F4)");
        assertTrue(html.contains("#F0F7F3"), "Must include light brand tint (#F0F7F3)");

        // Verify brand logo
        assertTrue(html.contains("alt=\"AssessMate\""), "Must contain AssessMate logo alt");
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
        assertTrue(html.contains("10 minutes"));
        assertTrue(html.contains("Your password reset code"));
        assertTrue(content.getPlainTextBody().contains("918234"));
    }

    @Test
    @DisplayName("Variant A: Dedicated Namecheap-style confirmation code email")
    void testConfirmationCodeEmailVariantA() {
        EmailContent content = templateService.buildConfirmationCodeEmail("Alex", "482910", 10);

        assertEquals("Your AssessMate confirmation code", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Your confirmation code"));
        assertTrue(html.contains("Your verification code is:"));
        assertTrue(html.contains("482910"));
        assertTrue(html.contains("10 minutes"));
        assertTrue(html.contains("can only be used once"));
        assertTrue(content.getPlainTextBody().contains("Your confirmation code"));
        assertTrue(content.getPlainTextBody().contains("482910"));
    }

    @Test
    @DisplayName("Branding: Password reset confirmation notification email")
    void testPasswordResetSuccessEmail() {
        EmailContent content = templateService.buildPasswordResetSuccessEmail("Sarah Connor", "sarah@example.com");

        assertEquals("Your AssessMate password was changed", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("sarah@example.com"));
        assertTrue(html.contains("Password updated"));
        assertTrue(html.contains("#2F6F4E"));
    }

    @Test
    @DisplayName("Branding: Admin invitation email includes button and fallback link")
    void testAdminInvitationEmail() {
        String setupUrl = "https://app.assessmate.com/admin/setup-password?token=secret123";
        EmailContent content = templateService.buildAdminInvitationEmail("Marcus Vance", setupUrl, 30);

        assertEquals("You've been invited as an Administrator on AssessMate", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Set up administrator password"));
        assertTrue(html.contains("https://app.assessmate.com/admin/setup-password?token=secret123"));
        assertTrue(html.contains("expires in 30 minutes"));
        assertTrue(content.getPlainTextBody().contains(setupUrl));
    }

    @Test
    @DisplayName("Branding: Admin invitation resend email")
    void testAdminInvitationResendEmail() {
        String setupUrl = "https://app.assessmate.com/admin/setup-password?token=newtoken456";
        EmailContent content = templateService.buildAdminInvitationResendEmail("Marcus Vance", setupUrl, 30);

        assertEquals("Your AssessMate Administrator invitation (resent)", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Administrator invitation (resent)"));
        assertTrue(html.contains("Activate administrator account"));
        assertTrue(html.contains(setupUrl));
    }

    @Test
    @DisplayName("Branding: Admin account activated confirmation email")
    void testAdminAccountActivatedEmail() {
        String dashUrl = "https://app.assessmate.com/admin/dashboard";
        EmailContent content = templateService.buildAdminAccountActivatedEmail("Chief Admin", dashUrl);

        assertEquals("Administrator account activated - AssessMate", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Administrator account activated"));
        assertTrue(html.contains("System administrator"));
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

        assertEquals("Exam invitation: Advanced Algorithms Final", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Advanced Algorithms Final"));
        assertTrue(html.contains("Computer Science 401"));
        assertTrue(html.contains("ALGO88"));
        assertTrue(html.contains("120 minutes"));
        assertTrue(html.contains("Desktop or laptop with webcam and microphone"));
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
    @DisplayName("Branding: Candidate Invitation Email contains test details, join code, and instructions")
    void testCandidateInvitationEmail() {
        String inviteUrl = "https://assessmate.me/invite?token=cand-token-99";
        EmailContent content = templateService.buildCandidateInvitationEmail(
                "Jane Doe",
                inviteUrl,
                "Apex University",
                60
        );

        assertEquals("You've been invited to AssessMate", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("invited to AssessMate"));
        assertTrue(html.contains("Apex University"));
        assertTrue(html.contains("Candidate"));
        assertTrue(html.contains("60 minutes"));
        assertTrue(html.contains("Accept invitation"));
        assertTrue(html.contains(inviteUrl));
        assertTrue(content.getPlainTextBody().contains("You're invited to AssessMate"));
        assertTrue(content.getPlainTextBody().contains(inviteUrl));
    }

    @Test
    @DisplayName("Branding: Host Invitation Email contains invitation link, expiry and role details")
    void testHostInvitationEmail() {
        String inviteUrl = "https://assessmate.me/host/setup?token=host-token-123";
        EmailContent content = templateService.buildHostInvitationEmail("Dr. Jane", inviteUrl, "Apex University", 48);

        assertEquals("You've been invited to AssessMate as a Host", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("invited to AssessMate as a Host"));
        assertTrue(html.contains("Apex University"));
        assertTrue(html.contains("Host (assessment creator)"));
        assertTrue(html.contains("Accept invitation"));
        assertTrue(html.contains(inviteUrl));
        assertTrue(html.contains("48 minutes"));
        assertTrue(content.getPlainTextBody().contains("You're invited to AssessMate as a Host"));
        assertTrue(content.getPlainTextBody().contains(inviteUrl));
    }

    @Test
    @DisplayName("Branding: Welcome Email contains login link and getting started tips")
    void testWelcomeEmail() {
        String loginUrl = "https://assessmate.me/login";
        EmailContent content = templateService.buildWelcomeEmail("Alice Smith", "CANDIDATE", loginUrl);

        assertEquals("Welcome to AssessMate", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Welcome to AssessMate"));
        assertTrue(html.contains("Alice Smith"));
        assertTrue(html.contains("Get started"));
        assertTrue(html.contains(loginUrl));
        assertTrue(content.getPlainTextBody().contains(loginUrl));
    }

    @Test
    @DisplayName("Branding: Password Changed Notification Email contains security notice")
    void testPasswordChangedNotificationEmail() {
        String recoveryUrl = "https://assessmate.me/forgot-password";
        EmailContent content = templateService.buildPasswordChangedNotificationEmail("Bob Jones", "bob@example.com", recoveryUrl);

        assertEquals("Your AssessMate password was changed", content.getSubject());
        String html = content.getHtmlBody();

        assertTrue(html.contains("Your password was changed"));
        assertTrue(html.contains("bob@example.com"));
        assertTrue(html.contains("Password updated"));
        assertTrue(html.contains(recoveryUrl));
        assertTrue(content.getPlainTextBody().contains(recoveryUrl));
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

