package com.assessmate.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.assessmate.dto.EmailContent;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import okhttp3.*;
import okio.Buffer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class BrevoEmailServiceTest {

    private BrevoEmailService brevoEmailService;
    private ListAppender<ILoggingEvent> listAppender;
    private Logger logger;

    @BeforeEach
    void setUp() {
        brevoEmailService = new BrevoEmailService("test-brevo-api-key-12345");
        brevoEmailService.setFromAddress("mail@assessmate.me");
        brevoEmailService.setSenderName("AssessMate");
        brevoEmailService.setReplyToAddress("support@assessmate.me");
        brevoEmailService.setApiUrl("https://api.brevo.com/v3/smtp/email");

        logger = (Logger) LoggerFactory.getLogger(BrevoEmailService.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        logger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (logger != null && listAppender != null) {
            logger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    @Test
    @DisplayName("Brevo API: Successful dispatch produces correct HTTP headers, payload, and returns true")
    void testSendEmailSuccess() {
        AtomicReference<String> capturedMethod = new AtomicReference<>();
        AtomicReference<String> capturedUrl = new AtomicReference<>();
        AtomicReference<String> capturedApiKey = new AtomicReference<>();
        AtomicReference<String> capturedContentType = new AtomicReference<>();
        AtomicReference<String> capturedAccept = new AtomicReference<>();
        AtomicReference<String> capturedBody = new AtomicReference<>();

        OkHttpClient mockClient = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    Request req = chain.request();
                    capturedMethod.set(req.method());
                    capturedUrl.set(req.url().toString());
                    capturedApiKey.set(req.header("api-key"));
                    capturedContentType.set(req.header("Content-Type"));
                    capturedAccept.set(req.header("Accept"));

                    Buffer buffer = new Buffer();
                    if (req.body() != null) {
                        req.body().writeTo(buffer);
                        capturedBody.set(buffer.readUtf8());
                    }

                    return new Response.Builder()
                            .request(req)
                            .protocol(Protocol.HTTP_1_1)
                            .code(201)
                            .message("Created")
                            .body(ResponseBody.create("{\"messageId\":\"<20261110.12345@smtp-relay.brevo.com>\"}", MediaType.parse("application/json")))
                            .build();
                })
                .build();

        brevoEmailService.setHttpClient(mockClient);

        EmailContent content = EmailContent.builder()
                .subject("AssessMate - Password Reset")
                .htmlBody("<h1>Reset your password</h1><p>Secret code: 998877</p>")
                .plainTextBody("Reset your password. Secret code: 998877")
                .build();

        boolean result = brevoEmailService.sendEmail("candidate@assessmate.me", content);

        assertTrue(result, "sendEmail should return true on HTTP 201 Created");
        assertEquals("POST", capturedMethod.get());
        assertEquals("https://api.brevo.com/v3/smtp/email", capturedUrl.get());
        assertEquals("test-brevo-api-key-12345", capturedApiKey.get());
        assertEquals("application/json", capturedContentType.get());
        assertEquals("application/json", capturedAccept.get());

        // Validate JSON payload structure
        assertNotNull(capturedBody.get());
        JsonObject payload = JsonParser.parseString(capturedBody.get()).getAsJsonObject();
        assertEquals("mail@assessmate.me", payload.getAsJsonObject("sender").get("email").getAsString());
        assertEquals("AssessMate", payload.getAsJsonObject("sender").get("name").getAsString());
        assertEquals("candidate@assessmate.me", payload.getAsJsonArray("to").get(0).getAsJsonObject().get("email").getAsString());
        assertEquals("support@assessmate.me", payload.getAsJsonObject("replyTo").get("email").getAsString());
        assertEquals("AssessMate - Password Reset", payload.get("subject").getAsString());
        assertTrue(payload.get("htmlContent").getAsString().contains("998877"));
        assertTrue(payload.get("textContent").getAsString().contains("998877"));

        // Validate log security: secret code and API key must never be logged
        List<ILoggingEvent> logs = listAppender.list;
        for (ILoggingEvent logEvent : logs) {
            String msg = logEvent.getFormattedMessage();
            assertFalse(msg.contains("998877"), "Log must not contain OTP/secret token");
            assertFalse(msg.contains("test-brevo-api-key-12345"), "Log must not contain Brevo API key");
        }
    }

    @Test
    @DisplayName("Brevo API: HTTP error status is handled gracefully and returns false")
    void testSendEmailHttpError() {
        OkHttpClient mockClient = new OkHttpClient.Builder()
                .addInterceptor(chain -> new Response.Builder()
                        .request(chain.request())
                        .protocol(Protocol.HTTP_1_1)
                        .code(401)
                        .message("Unauthorized")
                        .body(ResponseBody.create("{\"code\":\"unauthorized\",\"message\":\"Key not found\"}", MediaType.parse("application/json")))
                        .build())
                .build();

        brevoEmailService.setHttpClient(mockClient);

        boolean result = brevoEmailService.sendEmail("user@example.com", "Test User", "Test Subject", "<p>Hello</p>", "Hello");
        assertFalse(result, "sendEmail should return false on HTTP 401 Unauthorized");

        // Verify error logged
        boolean errorLogged = listAppender.list.stream()
                .anyMatch(e -> e.getLevel() == Level.ERROR && e.getFormattedMessage().contains("Brevo API rejected email"));
        assertTrue(errorLogged, "An error log should be recorded when Brevo returns an HTTP error code");
    }

    @Test
    @DisplayName("Brevo API: Network timeout is caught and returns false safely")
    void testSendEmailTimeout() {
        OkHttpClient mockClient = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    throw new SocketTimeoutException("Connection timed out to api.brevo.com");
                })
                .build();

        brevoEmailService.setHttpClient(mockClient);

        boolean result = brevoEmailService.sendEmail("timeout@example.com", "Timeout User", "Test Subject", "<p>Hi</p>", "Hi");
        assertFalse(result, "sendEmail should catch SocketTimeoutException and return false");

        boolean timeoutLogged = listAppender.list.stream()
                .anyMatch(e -> e.getLevel() == Level.ERROR && e.getFormattedMessage().contains("Brevo API timeout"));
        assertTrue(timeoutLogged, "A timeout log entry should be recorded");
    }

    @Test
    @DisplayName("Brevo API: Unconfigured service returns false without HTTP request")
    void testSendEmailUnconfigured() {
        BrevoEmailService unconfigured = new BrevoEmailService("");
        assertFalse(unconfigured.isConfigured());
        boolean result = unconfigured.sendEmail("user@example.com", null, "Subject", "<p>Hi</p>", "Hi");
        assertFalse(result);
    }
}

