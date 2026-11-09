package com.assessmate.service.storage;

import com.assessmate.exception.BadRequestException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;

@Component
public class StorageFileValidator {

    public static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024; // 5 MB
    public static final long MAX_AUDIO_SIZE = 10L * 1024 * 1024; // 10 MB

    private static final Set<String> ALLOWED_IMAGE_MIMES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private static final Set<String> ALLOWED_AUDIO_MIMES = Set.of(
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/x-wav",
            "audio/wave",
            "audio/ogg",
            "audio/mp4",
            "audio/x-m4a",
            "audio/aac",
            "audio/webm",
            "video/webm", // Common browser MediaRecorder MIME type for audio-only WebM
            "application/octet-stream" // Generic container fallback, validated via magic bytes
    );

    public record ValidatedFile(String mimeType, String extension) {}

    public ValidatedFile validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Image file is empty or missing.");
        }

        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new BadRequestException("Image exceeds maximum allowed size of 5MB.");
        }

        String declaredMime = file.getContentType();
        byte[] header = readHeader(file, 64);

        // Security check: reject executable or scripted files
        assertNotMalicious(header);

        String detectedExt = detectImageSignature(header);
        if (detectedExt == null) {
            throw new BadRequestException("Invalid or unsupported image file content. Allowed formats: JPEG, PNG, WEBP, GIF.");
        }

        String finalMime = switch (detectedExt) {
            case ".jpg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".webp" -> "image/webp";
            case ".gif" -> "image/gif";
            default -> declaredMime != null ? declaredMime : "image/jpeg";
        };

        if (declaredMime != null && !declaredMime.isBlank() && !ALLOWED_IMAGE_MIMES.contains(declaredMime.toLowerCase())) {
            throw new BadRequestException("Declared image MIME type '" + declaredMime + "' is not permitted.");
        }

        return new ValidatedFile(finalMime, detectedExt);
    }

    public ValidatedFile validateAudio(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Audio file is empty or missing.");
        }

        if (file.getSize() > MAX_AUDIO_SIZE) {
            throw new BadRequestException("Audio exceeds maximum allowed size of 10MB.");
        }

        String declaredMime = file.getContentType();
        if (declaredMime != null && !declaredMime.isBlank() && !ALLOWED_AUDIO_MIMES.contains(declaredMime.toLowerCase())) {
            throw new BadRequestException("Declared audio MIME type '" + declaredMime + "' is not permitted.");
        }

        byte[] header = readHeader(file, 64);

        // Security check: reject executable or scripted files
        assertNotMalicious(header);

        String detectedExt = detectAudioSignature(header);
        if (detectedExt == null) {
            // Check if fallback to client extension or declared MIME is possible for compliant audio streams
            if (declaredMime != null) {
                String dm = declaredMime.toLowerCase();
                if (dm.contains("webm")) detectedExt = ".webm";
                else if (dm.contains("ogg")) detectedExt = ".ogg";
                else if (dm.contains("wav")) detectedExt = ".wav";
                else if (dm.contains("mpeg") || dm.contains("mp3")) detectedExt = ".mp3";
                else if (dm.contains("mp4") || dm.contains("m4a")) detectedExt = ".m4a";
                else if (dm.contains("aac")) detectedExt = ".aac";
            }
        }

        if (detectedExt == null) {
            throw new BadRequestException("Invalid or unsupported audio file content. Allowed formats: MP3, WAV, OGG, M4A, AAC, WebM.");
        }

        String finalMime = switch (detectedExt) {
            case ".mp3" -> "audio/mpeg";
            case ".wav" -> "audio/wav";
            case ".ogg" -> "audio/ogg";
            case ".m4a" -> "audio/mp4";
            case ".aac" -> "audio/aac";
            case ".webm" -> "audio/webm";
            default -> declaredMime != null ? declaredMime : "audio/webm";
        };

        return new ValidatedFile(finalMime, detectedExt);
    }

    private byte[] readHeader(MultipartFile file, int bytesCount) {
        try (InputStream is = file.getInputStream()) {
            byte[] buffer = new byte[bytesCount];
            int read = is.read(buffer);
            if (read <= 0) return new byte[0];
            return read == bytesCount ? buffer : Arrays.copyOf(buffer, read);
        } catch (IOException e) {
            throw new BadRequestException("Could not read file stream for validation: " + e.getMessage());
        }
    }

    private void assertNotMalicious(byte[] header) {
        if (header == null || header.length < 2) return;

        // Windows PE executable (MZ)
        if (header[0] == 0x4D && header[1] == 0x5A) {
            throw new BadRequestException("Executable binary files (.exe/.dll) are prohibited.");
        }
        // Linux ELF binary
        if (header.length >= 4 && header[0] == 0x7F && header[1] == 'E' && header[2] == 'L' && header[3] == 'F') {
            throw new BadRequestException("Executable binary files (.elf) are prohibited.");
        }

        String sample = new String(header, 0, Math.min(header.length, 64), StandardCharsets.ISO_8859_1).toLowerCase();
        if (sample.contains("<script") || sample.contains("<html") || sample.contains("<?php") || sample.contains("<svg")) {
            throw new BadRequestException("HTML, SVG, PHP and script files are strictly prohibited.");
        }
    }

    private String detectImageSignature(byte[] h) {
        if (h.length < 4) return null;

        // JPEG: FF D8 FF
        if ((h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return ".jpg";
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (h.length >= 8 &&
                (h[0] & 0xFF) == 0x89 && (h[1] & 0xFF) == 0x50 && (h[2] & 0xFF) == 0x4E && (h[3] & 0xFF) == 0x47 &&
                (h[4] & 0xFF) == 0x0D && (h[5] & 0xFF) == 0x0A && (h[6] & 0xFF) == 0x1A && (h[7] & 0xFF) == 0x0A) {
            return ".png";
        }

        // GIF: GIF87a or GIF89a
        if (h.length >= 6 && h[0] == 'G' && h[1] == 'I' && h[2] == 'F' && h[3] == '8' &&
                (h[4] == '7' || h[4] == '9') && h[5] == 'a') {
            return ".gif";
        }

        // WEBP: RIFF at 0..3 and WEBP at 8..11
        if (h.length >= 12 &&
                h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' &&
                h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return ".webp";
        }

        return null;
    }

    private String detectAudioSignature(byte[] h) {
        if (h.length < 4) return null;

        // WebM / EBML: 1A 45 DF A3
        if ((h[0] & 0xFF) == 0x1A && (h[1] & 0xFF) == 0x45 && (h[2] & 0xFF) == 0xDF && (h[3] & 0xFF) == 0xA3) {
            return ".webm";
        }

        // OggS: 4F 67 67 53
        if (h[0] == 'O' && h[1] == 'g' && h[2] == 'g' && h[3] == 'S') {
            return ".ogg";
        }

        // WAV: RIFF at 0..3 and WAVE at 8..11
        if (h.length >= 12 &&
                h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' &&
                h[8] == 'W' && h[9] == 'A' && h[10] == 'V' && h[11] == 'E') {
            return ".wav";
        }

        // MP3 with ID3 tag: 49 44 33 ("ID3")
        if (h[0] == 'I' && h[1] == 'D' && h[2] == '3') {
            return ".mp3";
        }

        // MP3 sync frame: FF FB or FF F3 or FF F2 or FF E0..FF FF
        if ((h[0] & 0xFF) == 0xFF && ((h[1] & 0xE0) == 0xE0)) {
            return ".mp3";
        }

        // M4A / MP4: ftyp at offset 4..7
        if (h.length >= 8 && h[4] == 'f' && h[5] == 't' && h[6] == 'y' && h[7] == 'p') {
            return ".m4a";
        }

        // AAC ADTS header: FF F1 or FF F9
        if ((h[0] & 0xFF) == 0xFF && ((h[1] & 0xF6) == 0xF0)) {
            return ".aac";
        }

        return null;
    }
}

