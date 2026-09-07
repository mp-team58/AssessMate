package com.assessmate.service;

import com.google.gson.*;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Value("${gemini.api.model:gemini-3.6-flash}")
    private String model;

    @Value("${gemini.temperature:0.3}")
    private double temperature;

    @Value("${gemini.max.output.tokens:8192}")
    private int maxOutputTokens;

    private final OkHttpClient client =
        new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();

    private final Gson gson = new Gson();

    // ─────────────────────────────────────────
    // PUBLIC METHODS
    // ─────────────────────────────────────────

    public List<GeneratedQuestion>
            generateFromText(
                String sourceText,
                String topic,
                int totalQuestions,
                int easyCount,
                int mediumCount,
                int hardCount,
                int singleChoiceCount,
                int multipleSelectCount,
                int fillBlankCount,
                int numericalCount) {

        String prompt = buildPrompt(
            sourceText, topic,
            totalQuestions,
            easyCount, mediumCount, hardCount,
            singleChoiceCount, multipleSelectCount,
            fillBlankCount, numericalCount,
            false);

        return callGemini(prompt, null);
    }

    public List<GeneratedQuestion>
            generateFromImage(
                byte[] imageBytes,
                String topic,
                int totalQuestions) {

        String prompt =
            "You are an expert exam question " +
            "creator. Look at this image carefully.\n\n"
            + (topic != null && !topic.isEmpty()
                ? "Focus on the topic: "
                    + topic + "\n\n"
                : "")
            + "Generate exactly " + totalQuestions
            + " multiple choice questions "
            + "(SINGLE_CHOICE) based ONLY on what "
            + "you see in this image.\n\n"
            + buildJsonFormatInstructions(
                totalQuestions);

        return callGemini(prompt, imageBytes);
    }

    public List<GeneratedQuestion>
            generateFromTopic(
                String topic,
                int totalQuestions,
                int easyCount,
                int mediumCount,
                int hardCount,
                int singleChoiceCount,
                int multipleSelectCount,
                int fillBlankCount,
                int numericalCount) {

        String prompt = buildPrompt(
            null, topic, totalQuestions,
            easyCount, mediumCount, hardCount,
            singleChoiceCount, multipleSelectCount,
            fillBlankCount, numericalCount,
            true);

        return callGemini(prompt, null);
    }

    // ─────────────────────────────────────────
    // PROMPT BUILDER
    // ─────────────────────────────────────────

   private String buildPrompt(
        String sourceText,
        String topic,
        int totalQuestions,
        int easyCount,
        int mediumCount,
        int hardCount,
        int singleChoiceCount,
        int multipleSelectCount,
        int fillBlankCount,
        int numericalCount,
        boolean topicOnly) {

    StringBuilder prompt =
        new StringBuilder();

    if (topicOnly) {
        prompt.append(
            "You are an expert exam " +
            "question creator.\n\n");
        prompt.append(
            "Generate questions about " +
            "the topic: ")
            .append(topic)
            .append("\n\n");
    } else {
        prompt.append(
            "You are an expert exam " +
            "question creator.\n\n");
        prompt.append(
            "Generate questions STRICTLY " +
            "from the following source " +
            "material. Do NOT use any " +
            "outside knowledge. Every " +
            "question and correct answer " +
            "must be directly supported " +
            "by the text below.\n\n");

        prompt.append(
            "<source_material>\n");

        // Dynamic char limit
        // 800 chars per question
        // Min 4000, Max 32000
        int charLimit = Math.min(32000,
            Math.max(4000,
                totalQuestions * 800));

        String limited =
            sourceText != null
            && sourceText.length() > charLimit
            ? sourceText.substring(0, charLimit)
            : sourceText;

        prompt.append(limited);
        prompt.append("\n</source_material>\n\n");

        if (topic != null
                && !topic.trim().isEmpty()) {
            prompt.append(
                "<topic>\n")
                .append(topic)
                .append("\n</topic>\n\n");
        }
    }

    prompt.append(
        "<instructions>\n");
    prompt.append("Generate exactly ")
        .append(totalQuestions)
        .append(" questions:\n");
    prompt.append("- EASY: ")
        .append(easyCount).append("\n");
    prompt.append("- MEDIUM: ")
        .append(mediumCount).append("\n");
    prompt.append("- HARD: ")
        .append(hardCount).append("\n\n");
    prompt.append(
        "Question type distribution:\n");
    if (singleChoiceCount > 0) {
        prompt.append("- SINGLE_CHOICE: ")
            .append(singleChoiceCount)
            .append("\n");
    }
    if (multipleSelectCount > 0) {
        prompt.append("- MULTIPLE_SELECT: ")
            .append(multipleSelectCount)
            .append("\n");
    }
    if (fillBlankCount > 0) {
        prompt.append("- FILL_BLANK: ")
            .append(fillBlankCount)
            .append("\n");
    }
    if (numericalCount > 0) {
        prompt.append("- NUMERICAL: ")
            .append(numericalCount)
            .append("\n");
    }
    prompt.append(
        "Important rules:\n" +
        "- Follow the exact difficulty distribution.\n" +
        "- Follow the exact question-type distribution.\n" +
        "- Do not generate duplicate questions.\n" +
        "- For SINGLE_CHOICE and MULTIPLE_SELECT, provide optionA, optionB, optionC, and optionD.\n" +
        "- For FILL_BLANK and NUMERICAL, set optionA, optionB, optionC, and optionD to null.\n" +
        "- For NUMERICAL, tolerance must be zero or a positive number.\n" +
        "- If source material is insufficient, return fewer questions rather than inventing facts.\n"
    );

    prompt.append("</instructions>\n\n");

    prompt.append(
        buildJsonFormatInstructions(
            totalQuestions));

    return prompt.toString();
}

    private String buildJsonFormatInstructions(
            int totalQuestions) {
        return "Return ONLY a valid JSON array " +
            "with exactly " + totalQuestions +
            " objects. No markdown, no extra text." +
            "\n\nEach object:\n" +
            "{\n" +
            "  \"questionText\": \"string\",\n" +
            "  \"type\": \"SINGLE_CHOICE|" +
            "MULTIPLE_SELECT|FILL_BLANK|NUMERICAL\",\n" +
            "  \"difficulty\": \"EASY|MEDIUM|HARD\",\n" +
            "  \"optionA\": \"string or null\",\n" +
            "  \"optionB\": \"string or null\",\n" +
            "  \"optionC\": \"string or null\",\n" +
            "  \"optionD\": \"string or null\",\n" +
            "  \"correctAnswer\": \"A|B|C|D for " +
            "SINGLE_CHOICE, A,C for MULTIPLE_SELECT," +
            " word for FILL_BLANK, number for " +
            "NUMERICAL\",\n" +
            "  \"explanation\": \"string\",\n" +
            "  \"topic\": \"string\",\n" +
            "  \"tolerance\": 0\n" +
            "}";
    }

    // ─────────────────────────────────────────
    // UNIFIED GEMINI CALL
    // ─────────────────────────────────────────

    private List<GeneratedQuestion> callGemini(
            String prompt,
            byte[] imageBytes) {

        JsonObject requestBody = new JsonObject();
        boolean isInteractionsApi = apiUrl != null && apiUrl.contains("interactions");

        if (isInteractionsApi) {
            // Interactions API payload: POST /v1beta/interactions
            requestBody.addProperty("model", model != null ? model : "gemini-3.6-flash");

            if (imageBytes != null) {
                JsonArray inputArray = new JsonArray();
                JsonObject textPart = new JsonObject();
                textPart.addProperty("type", "text");
                textPart.addProperty("text", prompt);
                inputArray.add(textPart);

                String base64 = Base64.getEncoder().encodeToString(imageBytes);
                JsonObject imagePart = new JsonObject();
                imagePart.addProperty("type", "image");
                imagePart.addProperty("data", base64);
                imagePart.addProperty("mime_type", "image/png");
                inputArray.add(imagePart);

                requestBody.add("input", inputArray);
            } else {
                requestBody.addProperty("input", prompt);
            }

            JsonObject genConfig = new JsonObject();
            genConfig.addProperty("temperature", temperature);
            genConfig.addProperty("max_output_tokens", maxOutputTokens);
            requestBody.add("generation_config", genConfig);

        } else {
            // Classic generateContent API payload
            JsonArray contents = new JsonArray();
            JsonObject content = new JsonObject();
            JsonArray parts = new JsonArray();

            // Text part
            JsonObject textPart = new JsonObject();
            textPart.addProperty("text", prompt);
            parts.add(textPart);

            // Image part if provided
            if (imageBytes != null) {
                String base64 = Base64.getEncoder().encodeToString(imageBytes);
                JsonObject imagePart = new JsonObject();
                JsonObject inlineData = new JsonObject();
                inlineData.addProperty("mime_type", "image/png");
                inlineData.addProperty("data", base64);
                imagePart.add("inline_data", inlineData);
                parts.add(imagePart);
            }

            content.add("parts", parts);
            contents.add(content);
            requestBody.add("contents", contents);

            JsonObject genConfig = new JsonObject();
            genConfig.addProperty("temperature", temperature);
            genConfig.addProperty("maxOutputTokens", maxOutputTokens);
            requestBody.add("generationConfig", genConfig);
        }

        String url = apiUrl;
        if (!url.contains("key=") && (apiKey != null && !apiKey.isEmpty())) {
            url = apiUrl + (apiUrl.contains("?") ? "&key=" : "?key=") + apiKey;
        }

        Request.Builder requestBuilder = new Request.Builder()
            .url(url)
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", apiKey != null ? apiKey : "")
            .post(RequestBody.create(
                gson.toJson(requestBody),
                MediaType.parse("application/json")));

        if (isInteractionsApi) {
            requestBuilder.header("Api-Revision", "2026-05-20");
        }

        Request request = requestBuilder.build();

        try (Response response = client.newCall(request).execute()) {

            if (response.body() == null) {
                throw new RuntimeException("Empty response from AI service");
            }

            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                log.error("Gemini API error {}: {}", response.code(), responseBody);
                throw new RuntimeException("AI service error " + response.code() + ". Please try again.");
            }

            return parseGeminiResponse(responseBody);

        } catch (IOException e) {
            log.error("Gemini connection error: {}", e.getMessage());
            throw new RuntimeException(
                "Could not connect to AI service. Please check your connection and try again.");
        }
    }

    // ─────────────────────────────────────────
    // PARSE RESPONSE
    // ─────────────────────────────────────────

    private List<GeneratedQuestion> parseGeminiResponse(String responseBody) {
        try {
            JsonObject response = gson.fromJson(responseBody, JsonObject.class);

            String text = extractGeneratedText(response);

            if (text == null || text.trim().isEmpty()) {
                log.error("No valid text output found in Gemini response: {}", responseBody);
                throw new RuntimeException("AI returned no results. Please try again.");
            }

            // Clean markdown fences
            text = text.trim();
            if (text.startsWith("```json")) {
                text = text.substring(7);
            } else if (text.startsWith("```")) {
                text = text.substring(3);
            }
            if (text.endsWith("```")) {
                text = text.substring(
                    0, text.length() - 3);
            }
            text = text.trim();

            JsonArray questions =
                gson.fromJson(text,
                    JsonArray.class);

            List<GeneratedQuestion> result =
                new ArrayList<>();

            for (JsonElement elem : questions) {
                JsonObject q =
                    elem.getAsJsonObject();
                result.add(
                    GeneratedQuestion.builder()
                        .questionText(
                            getStr(q, "questionText"))
                        .type(getStr(q, "type"))
                        .difficulty(
                            getStr(q, "difficulty"))
                        .optionA(getStr(q, "optionA"))
                        .optionB(getStr(q, "optionB"))
                        .optionC(getStr(q, "optionC"))
                        .optionD(getStr(q, "optionD"))
                        .correctAnswer(
                            getStr(q, "correctAnswer"))
                        .explanation(
                            getStr(q, "explanation"))
                        .topic(getStr(q, "topic"))
                        .tolerance(
                            q.has("tolerance")
                            && !q.get("tolerance")
                                .isJsonNull()
                            ? q.get("tolerance")
                                .getAsDouble()
                            : 0.0)
                        .build());
            }

            return result;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error(
                "Parse error: {}",
                e.getMessage());
            throw new RuntimeException(
                "AI returned unexpected format. " +
                "Please try again.");
        }
    }

    private String extractGeneratedText(JsonObject response) {
        if (response == null) return null;

        // 1. Direct output_text convenience property
        if (response.has("output_text") && !response.get("output_text").isJsonNull()) {
            return response.get("output_text").getAsString();
        }

        // 2. Steps timeline (Interactions API)
        if (response.has("steps") && response.get("steps").isJsonArray()) {
            JsonArray steps = response.getAsJsonArray("steps");
            for (int i = steps.size() - 1; i >= 0; i--) {
                JsonObject step = steps.get(i).getAsJsonObject();
                if (step.has("content") && step.get("content").isJsonArray()) {
                    JsonArray contentArray = step.getAsJsonArray("content");
                    StringBuilder sb = new StringBuilder();
                    for (JsonElement c : contentArray) {
                        JsonObject cObj = c.getAsJsonObject();
                        if (cObj.has("text") && !cObj.get("text").isJsonNull()) {
                            sb.append(cObj.get("text").getAsString());
                        }
                    }
                    if (sb.length() > 0) {
                        return sb.toString();
                    }
                }
            }
        }

        // 3. Candidates (Classic generateContent API)
        if (response.has("candidates") && response.get("candidates").isJsonArray()) {
            JsonArray candidates = response.getAsJsonArray("candidates");
            if (candidates.size() > 0) {
                JsonObject first = candidates.get(0).getAsJsonObject();
                if (first.has("content") && first.getAsJsonObject("content").has("parts")) {
                    JsonArray parts = first.getAsJsonObject("content").getAsJsonArray("parts");
                    if (parts.size() > 0 && parts.get(0).getAsJsonObject().has("text")) {
                        return parts.get(0).getAsJsonObject().get("text").getAsString();
                    }
                }
            }
        }

        return null;
    }

    private String getStr(
            JsonObject obj, String key) {
        if (!obj.has(key)
                || obj.get(key).isJsonNull()) {
            return null;
        }
        return obj.get(key).getAsString();
    }

    // ─────────────────────────────────────────
    // INNER CLASS
    // ─────────────────────────────────────────

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class GeneratedQuestion {
        private String questionText;
        private String type;
        private String difficulty;
        private String optionA;
        private String optionB;
        private String optionC;
        private String optionD;
        private String correctAnswer;
        private String explanation;
        private String topic;
        private Double tolerance;
    }
}
