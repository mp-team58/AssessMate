package com.assessmate.service.storage;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Locale;

@Component
public class StorageFileNameGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] HEX_CHARS = "0123456789abcdef".toCharArray();

    /**
     * Generates a short, random 8-character hex string.
     */
    public String generateShortHex() {
        byte[] bytes = new byte[4];
        RANDOM.nextBytes(bytes);
        char[] hex = new char[8];
        for (int i = 0; i < 4; i++) {
            int v = bytes[i] & 0xFF;
            hex[i * 2] = HEX_CHARS[v >>> 4];
            hex[i * 2 + 1] = HEX_CHARS[v & 0x0F];
        }
        return new String(hex);
    }

    /**
     * Sanitizes entity ID to prevent directory traversal or invalid characters.
     */
    private String sanitizeEntityId(Object entityId, String defaultPrefix) {
        if (entityId == null) {
            return defaultPrefix;
        }
        String s = entityId.toString().replaceAll("[^a-zA-Z0-9_-]", "").trim();
        return s.isBlank() ? defaultPrefix : s;
    }

    private String sanitizeExtension(String extension) {
        if (extension == null || extension.isBlank()) {
            return ".bin";
        }
        String ext = extension.trim().toLowerCase(Locale.ROOT);
        if (!ext.startsWith(".")) {
            ext = "." + ext;
        }
        return ext;
    }

    /**
     * Generates: questions/q_{entityId}_{randomHex}.{ext}
     */
    public String generateQuestionObjectPath(Object entityId, String extension) {
        String idStr = sanitizeEntityId(entityId, "new");
        String hex = generateShortHex();
        String ext = sanitizeExtension(extension);
        return "questions/q_" + idStr + "_" + hex + ext;
    }

    /**
     * Generates: proctoring/image/p_{entityId}_{randomHex}.{ext}
     */
    public String generateProctoringImageObjectPath(Object entityId, String extension) {
        String idStr = sanitizeEntityId(entityId, "ev");
        String hex = generateShortHex();
        String ext = sanitizeExtension(extension);
        return "proctoring/image/p_" + idStr + "_" + hex + ext;
    }

    /**
     * Generates: proctoring/audio/p_{entityId}_{randomHex}.{ext}
     */
    public String generateProctoringAudioObjectPath(Object entityId, String extension) {
        String idStr = sanitizeEntityId(entityId, "ev");
        String hex = generateShortHex();
        String ext = sanitizeExtension(extension);
        return "proctoring/audio/p_" + idStr + "_" + hex + ext;
    }
}

