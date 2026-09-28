package com.assessmate.service;

import com.assessmate.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.otp.expiry-minutes}")
    private int otpExpiryMinutes;

    public void sendRegistrationOtp(String toEmail, String name, String otp) {
        String subject = "Verify your AssessMate account";

        String body = "Hi " + name + ",\n\n" +
                "Your AssessMate verification code is:\n\n" +
                otp + "\n\n" +
                "This code expires in " + otpExpiryMinutes + " minutes.\n\n" +
                "If you did not try to create an AssessMate account, " +
                "you can safely ignore this email.\n\n" +
                "— AssessMate";

        send(toEmail, subject, body);
    }

    public void sendPasswordResetOtp(String toEmail, String otp) {
        String subject = "Reset your AssessMate password";

        String body = "Hi,\n\n" +
                "Your AssessMate password reset code is:\n\n" +
                otp + "\n\n" +
                "This code expires in " + otpExpiryMinutes + " minutes.\n\n" +
                "If you did not request a password reset, " +
                "you can safely ignore this email. " +
                "Your password will not be changed.\n\n" +
                "— AssessMate";

        send(toEmail, subject, body);
    }

    private void send(String toEmail, String subject, String body) {
        log.info("\n========== EMAIL SIMULATION ==========\nTo: {}\nSubject: {}\n{}\n======================================", toEmail, subject, body);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {} (Did you configure MAIL_USERNAME in .env?). OTP was printed above for testing.", toEmail);
        }
    }
}
