package com.assessmate.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Immutable container for multi-part transactional email content.
 * Holds the email subject, responsive branded HTML body, and plain-text fallback.
 */
@Getter
@Builder
public class EmailContent {
    private final String subject;
    private final String htmlBody;
    private final String plainTextBody;

    public EmailContent(String subject, String htmlBody, String plainTextBody) {
        this.subject = subject;
        this.htmlBody = htmlBody;
        this.plainTextBody = plainTextBody;
    }
}

