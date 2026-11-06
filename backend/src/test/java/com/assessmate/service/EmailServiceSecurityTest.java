package com.assessmate.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EmailServiceSecurityTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    private ListAppender<ILoggingEvent> listAppender;
    private Logger emailLogger;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromAddress", "noreply@assessmate.com");
        ReflectionTestUtils.setField(emailService, "otpExpiryMinutes", 10);

        emailLogger = (Logger) LoggerFactory.getLogger(EmailService.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        emailLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (emailLogger != null && listAppender != null) {
            emailLogger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    @Test
    @DisplayName("P1.2 Log Security: Registration OTP is never logged in plaintext")
    void testRegistrationOtpNotLogged() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        String secretOtp = "948271";
        emailService.sendRegistrationOtp("candidate@example.com", "Alice Smith", secretOtp);

        verify(mailSender).send(any(SimpleMailMessage.class));

        List<ILoggingEvent> logs = listAppender.list;
        assertFalse(logs.isEmpty(), "Expected at least one log entry from EmailService");

        for (ILoggingEvent event : logs) {
            String formattedMsg = event.getFormattedMessage();
            assertFalse(formattedMsg.contains(secretOtp), "Log message contains plaintext registration OTP!");
            assertTrue(formattedMsg.contains("(content redacted)"), "Log message should indicate content is redacted");
        }
    }

    @Test
    @DisplayName("P1.2 Log Security: Password reset OTP is never logged in plaintext")
    void testPasswordResetOtpNotLogged() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        String resetOtp = "519302";
        emailService.sendPasswordResetOtp("user@example.com", resetOtp);

        verify(mailSender).send(any(SimpleMailMessage.class));

        List<ILoggingEvent> logs = listAppender.list;
        assertFalse(logs.isEmpty());

        for (ILoggingEvent event : logs) {
            String formattedMsg = event.getFormattedMessage();
            assertFalse(formattedMsg.contains(resetOtp), "Log message contains plaintext password reset OTP!");
        }
    }

    @Test
    @DisplayName("P1.2 Log Security: Admin invitation setup URL and token are never logged in plaintext")
    void testAdminInvitationTokenNotLogged() {
        doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        String secretToken = "super-confidential-token-abc-777";
        String setupUrl = "https://app.assessmate.com/admin/setup?token=" + secretToken;
        emailService.sendAdminInvitation("admin@example.com", "Admin Guy", setupUrl);

        verify(mailSender).send(any(SimpleMailMessage.class));

        List<ILoggingEvent> logs = listAppender.list;
        assertFalse(logs.isEmpty());

        for (ILoggingEvent event : logs) {
            String formattedMsg = event.getFormattedMessage();
            assertFalse(formattedMsg.contains(secretToken), "Log message contains sensitive admin invitation token!");
            assertFalse(formattedMsg.contains("setup?token="), "Log message contains sensitive admin invitation URL query!");
        }
    }
}

