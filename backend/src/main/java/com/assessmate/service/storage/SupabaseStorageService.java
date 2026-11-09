package com.assessmate.service.storage;

import com.assessmate.exception.BadRequestException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@Slf4j
@Service
public class SupabaseStorageService {

    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String bucketName;
    private final int defaultExpiresIn;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SupabaseStorageService(
            @Value("${supabase.url:https://vpdgjxmkluecxbhizzcd.supabase.co}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            @Value("${supabase.storage.bucket:assessmate-media}") String bucketName,
            @Value("${app.storage.signed-url.expiration-seconds:900}") int defaultExpiresIn,
            ObjectMapper objectMapper
    ) {
        this.supabaseUrl = (supabaseUrl != null ? supabaseUrl.trim().replaceAll("/+$", "") : "");
        this.serviceRoleKey = (serviceRoleKey != null ? serviceRoleKey.trim() : "");
        this.bucketName = (bucketName != null && !bucketName.isBlank() ? bucketName.trim() : "assessmate-media");
        this.defaultExpiresIn = defaultExpiresIn > 0 ? defaultExpiresIn : 900;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isConfigured() {
        return !serviceRoleKey.isBlank() && !supabaseUrl.isBlank();
    }

    public String getBucketName() {
        return bucketName;
    }

    public int getDefaultExpiresIn() {
        return defaultExpiresIn;
    }

    /**
     * Uploads binary content to the private Supabase Storage bucket.
     * If not configured with a service role key, falls back cleanly to local filesystem.
     */
    public void uploadFile(String objectPath, byte[] content, String contentType) {
        if (objectPath == null || objectPath.isBlank()) {
            throw new BadRequestException("Storage object path cannot be empty.");
        }

        // Clean leading slashes
        String cleanPath = objectPath.replaceAll("^/+", "");

        if (!isConfigured()) {
            log.info("Supabase storage key not configured; saving file locally to fallback path: {}", cleanPath);
            saveLocalFallback(cleanPath, content);
            return;
        }

        String targetUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + cleanPath;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                    .header("x-upsert", "false")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(content))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Successfully uploaded object to Supabase: {}/{}", bucketName, cleanPath);
                return;
            }

            // Check if error is duplicate (HTTP 409 / Conflict)
            if (response.statusCode() == 409) {
                log.warn("Supabase object {}/{} already exists.", bucketName, cleanPath);
                throw new BadRequestException("File already exists in storage.");
            }

            log.error("Failed to upload object to Supabase. HTTP Status: {}. Response: {}", response.statusCode(), response.body());
            throw new RuntimeException("Supabase Storage upload failed with status " + response.statusCode());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Upload to Supabase Storage was interrupted", e);
        } catch (IOException e) {
            log.error("Network I/O error during Supabase upload for {}: {}", cleanPath, e.getMessage());
            throw new RuntimeException("Network error uploading file to Supabase Storage: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a temporary signed URL for a private object in Supabase Storage.
     */
    public String createSignedUrl(String objectPath, int expiresInSeconds) {
        if (objectPath == null || objectPath.isBlank()) {
            throw new BadRequestException("Storage object path cannot be empty.");
        }

        String cleanPath = objectPath.replaceAll("^/+", "");
        // Normalize legacy prefix if present (e.g., uploads/questions/ -> questions/)
        cleanPath = normalizeLegacyPath(cleanPath);

        int expiration = expiresInSeconds > 0 ? expiresInSeconds : defaultExpiresIn;

        if (!isConfigured()) {
            log.debug("Supabase not configured; returning local media route for {}", cleanPath);
            return "/" + (cleanPath.startsWith("uploads/") ? cleanPath : "uploads/" + cleanPath);
        }

        String targetUrl = supabaseUrl + "/storage/v1/object/sign/" + bucketName + "/" + cleanPath;
        String jsonPayload = "{\"expiresIn\":" + expiration + "}";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String signedRelativeUrl = null;
                if (root.has("signedURL")) {
                    signedRelativeUrl = root.get("signedURL").asText();
                } else if (root.has("signedUrl")) {
                    signedRelativeUrl = root.get("signedUrl").asText();
                }

                if (signedRelativeUrl != null && !signedRelativeUrl.isBlank()) {
                    return resolveFullSignedUrl(signedRelativeUrl);
                }
            }

            log.error("Failed to generate signed URL from Supabase for {}. Status: {}, Body: {}",
                    cleanPath, response.statusCode(), response.body());
            throw new RuntimeException("Failed to generate signed URL: HTTP " + response.statusCode());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Supabase signed URL generation interrupted", e);
        } catch (IOException e) {
            log.error("Network error requesting signed URL for {}: {}", cleanPath, e.getMessage());
            throw new RuntimeException("Could not connect to Supabase Storage: " + e.getMessage(), e);
        }
    }

    /**
     * Deletes an object from Supabase Storage.
     */
    public void deleteFile(String objectPath) {
        if (objectPath == null || objectPath.isBlank()) {
            return;
        }

        String cleanPath = objectPath.replaceAll("^/+", "");
        cleanPath = normalizeLegacyPath(cleanPath);

        if (!isConfigured()) {
            deleteLocalFallback(cleanPath);
            return;
        }

        String targetUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + cleanPath;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .DELETE()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 || response.statusCode() == 204 || response.statusCode() == 404) {
                log.info("Object deleted or already absent in Supabase: {}/{}", bucketName, cleanPath);
            } else {
                log.warn("Non-success response deleting Supabase object {}: HTTP {}", cleanPath, response.statusCode());
            }
        } catch (Exception e) {
            log.warn("Failed to delete Supabase object {}: {}", cleanPath, e.getMessage());
        }
    }

    private String resolveFullSignedUrl(String relativeUrl) {
        if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
            return relativeUrl;
        }
        if (relativeUrl.startsWith("/storage/v1")) {
            return supabaseUrl + relativeUrl;
        }
        if (relativeUrl.startsWith("/object")) {
            return supabaseUrl + "/storage/v1" + relativeUrl;
        }
        return supabaseUrl + "/storage/v1/" + relativeUrl.replaceAll("^/+", "");
    }

    private String normalizeLegacyPath(String path) {
        if (path.startsWith("uploads/questions/")) {
            return "questions/" + path.substring("uploads/questions/".length());
        }
        if (path.startsWith("uploads/proctoring/images/")) {
            return "proctoring/image/" + path.substring("uploads/proctoring/images/".length());
        }
        if (path.startsWith("uploads/proctoring/audio/")) {
            return "proctoring/audio/" + path.substring("uploads/proctoring/audio/".length());
        }
        return path;
    }

    private void saveLocalFallback(String cleanPath, byte[] content) {
        try {
            Path target = Paths.get("uploads", cleanPath);
            Files.createDirectories(target.getParent());
            Files.write(target, content);
        } catch (IOException e) {
            log.warn("Could not save local fallback file {}: {}", cleanPath, e.getMessage());
        }
    }

    private void deleteLocalFallback(String cleanPath) {
        try {
            Path target = Paths.get("uploads", cleanPath);
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete local fallback file {}: {}", cleanPath, e.getMessage());
        }
    }
}

