package com.assessmate.service;

import com.assessmate.dto.EmailContent;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.concurrent.TimeUnit;

/**
 * Reusable email dispatch service using Brevo's Transactional Email REST API over HTTPS (port 443).
 * Replaces blocked outbound SMTP ports (25, 465, 587) on cloud platforms such as Render Free.
 *
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 * Header: api-key
 */
@Service
@Slf4j
public class BrevoEmailService {

    private static final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json; charset=utf-8");

    @Value("${brevo.api.key:${BREVO_API_KEY:}}")
    private String apiKey;

    @Value("${brevo.api.url:${BREVO_API_URL:https://api.brevo.com/v3/smtp/email}}")
    private String apiUrl = "https://api.brevo.com/v3/smtp/email";

    @Value("${app.mail.from:${MAIL_FROM:mail@assessmate.me}}")
    private String fromAddress = "mail@assessmate.me";

    @Value("${app.mail.sender-name:${MAIL_SENDER_NAME:AssessMate}}")
    private String senderName = "AssessMate";

    @Value("${app.mail.reply-to:${app.mail.support-email:${ASSESSMATE_SUPPORT_EMAIL:mail@assessmate.me}}}")
    private String replyToAddress = "mail@assessmate.me";

    @Value("${brevo.connect-timeout-ms:10000}")
    private long connectTimeoutMs = 10000;

    @Value("${brevo.read-timeout-ms:15000}")
    private long readTimeoutMs = 15000;

    @Value("${brevo.write-timeout-ms:10000}")
    private long writeTimeoutMs = 10000;

    private OkHttpClient httpClient;

    public BrevoEmailService() {
    }

    public BrevoEmailService(String apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Visible for testing to inject mock OkHttpClient.
     */
    public void setHttpClient(OkHttpClient httpClient) {
        this.httpClient = httpClient;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public void setApiUrl(String apiUrl) {
        this.apiUrl = apiUrl;
    }

    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public void setReplyToAddress(String replyToAddress) {
        this.replyToAddress = replyToAddress;
    }

    private OkHttpClient getClient() {
        if (this.httpClient != null) {
            return this.httpClient;
        }
        return new OkHttpClient.Builder()
                .connectTimeout(connectTimeoutMs, TimeUnit.MILLISECONDS)
                .readTimeout(readTimeoutMs, TimeUnit.MILLISECONDS)
                .writeTimeout(writeTimeoutMs, TimeUnit.MILLISECONDS)
                .build();
    }

    /**
     * Checks whether the Brevo REST API is configured with an API key.
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    /**
     * Sends transactional email using pre-built EmailContent (HTML + plain text).
     */
    public boolean sendEmail(String toEmail, EmailContent content) {
        if (content == null) {
            log.error("Cannot dispatch email to {}: content is null", toEmail);
            return false;
        }
        return sendEmail(toEmail, null, content.getSubject(), content.getHtmlBody(), content.getPlainTextBody());
    }

    /**
     * Sends transactional email via Brevo REST API over HTTPS.
     * Content (passwords, tokens, OTPs) is never logged.
     */
    public boolean sendEmail(String toEmail, String toName, String subject, String htmlContent, String textContent) {
        if (!isConfigured()) {
            log.warn("Brevo API key not configured. Cannot dispatch email to {}", toEmail);
            return false;
        }

        if (toEmail == null || toEmail.trim().isEmpty()) {
            log.error("Cannot dispatch email: recipient email is missing");
            return false;
        }

        // Sensitive content is strictly redacted in logs
        log.info("Brevo REST API dispatch: To={}, Subject='{}' (content redacted)", toEmail, subject);

        try {
            JsonObject payload = new JsonObject();

            // Sender
            JsonObject sender = new JsonObject();
            sender.addProperty("email", fromAddress != null ? fromAddress.trim() : "mail@assessmate.me");
            if (senderName != null && !senderName.trim().isEmpty()) {
                sender.addProperty("name", senderName.trim());
            }
            payload.add("sender", sender);

            // To recipient list
            JsonArray toList = new JsonArray();
            JsonObject recipient = new JsonObject();
            recipient.addProperty("email", toEmail.trim());
            if (toName != null && !toName.trim().isEmpty()) {
                recipient.addProperty("name", toName.trim());
            }
            toList.add(recipient);
            payload.add("to", toList);

            // Reply-To (if configured)
            if (replyToAddress != null && replyToAddress.matches("[^\\s@<>\"]+@[^\\s@<>\"]+")) {
                JsonObject replyTo = new JsonObject();
                replyTo.addProperty("email", replyToAddress.trim());
                if (senderName != null && !senderName.trim().isEmpty()) {
                    replyTo.addProperty("name", senderName.trim());
                }
                payload.add("replyTo", replyTo);
            }

            // Subject & Content
            payload.addProperty("subject", subject != null ? subject : "");
            if (htmlContent != null && !htmlContent.trim().isEmpty()) {
                payload.addProperty("htmlContent", htmlContent);
            }
            if (textContent != null && !textContent.trim().isEmpty()) {
                payload.addProperty("textContent", textContent);
            }

            RequestBody body = RequestBody.create(payload.toString(), JSON_MEDIA_TYPE);

            Request request = new Request.Builder()
                    .url(apiUrl)
                    .addHeader("api-key", apiKey.trim())
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Accept", "application/json")
                    .post(body)
                    .build();

            try (Response response = getClient().newCall(request).execute()) {
                int statusCode = response.code();
                String responseBody = response.body() != null ? response.body().string() : "";

                if (response.isSuccessful()) {
                    log.info("Brevo API email delivered successfully: To={}, Status={}", toEmail, statusCode);
                    return true;
                } else {
                    String safeError = extractSafeErrorMessage(responseBody, statusCode);
                    log.error("Brevo API rejected email: To={}, Status={}, Error={}", toEmail, statusCode, safeError);
                    return false;
                }
            }

        } catch (SocketTimeoutException e) {
            log.error("Brevo API timeout while sending email to {}: {}", toEmail, e.getMessage());
            return false;
        } catch (IOException e) {
            log.error("Brevo API I/O failure while sending email to {}: {}", toEmail, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Brevo API unexpected failure while sending email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    /**
     * Extracts safe error message without leaking sensitive parameters.
     */
    private String extractSafeErrorMessage(String responseBody, int statusCode) {
        if (responseBody == null || responseBody.trim().isEmpty()) {
            return "HTTP " + statusCode;
        }
        try {
            JsonObject json = JsonParser.parseString(responseBody).getAsJsonObject();
            if (json.has("message")) {
                return json.get("message").getAsString();
            }
            if (json.has("code")) {
                return json.get("code").getAsString();
            }
        } catch (Exception ignored) {
            // Non-JSON response
        }
        return responseBody.length() > 200 ? responseBody.substring(0, 200) + "..." : responseBody;
    }
}

