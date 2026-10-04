package com.assessmate.service;

import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.exception.ResourceNotFoundException;

import com.google.gson.*;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.TimeUnit;
import jakarta.annotation.PostConstruct;

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

    @Value("${gemini.max.output.tokens:16384}")
    private int maxOutputTokens;

    @Value("${gemini.read.timeout.seconds:180}")
    private int readTimeout;

    private OkHttpClient client;

    private final Gson gson = new Gson();

    @PostConstruct
    public void init() {
        client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(readTimeout, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
    }

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
                int totalQuestions,
                int easyCount,
                int mediumCount,
                int hardCount,
                int singleChoiceCount,
                int multipleSelectCount,
                int fillBlankCount,
                int numericalCount) {

        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an expert exam question creator. Look at this image carefully.\n\n");
        if (topic != null && !topic.isEmpty()) {
            prompt.append("Focus on the topic: ").append(topic).append("\n\n");
        }
        
        prompt.append("<instructions>\n");
        prompt.append("Generate exactly ")
            .append(totalQuestions)
            .append(" questions based ONLY on what you see in this image:\n");
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
            "- For NUMERICAL, tolerance must be zero or a positive number.\n"
        );
        prompt.append("</instructions>\n\n");

        prompt.append(buildJsonFormatInstructions(totalQuestions));

        return callGemini(prompt.toString(), imageBytes);
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

    public GeminiFeedbackResult generateFeedback(String wrongAnswersText) {
        String prompt = "You are an expert tutor. Analyze the following incorrect answers from a candidate's exam.\n" +
            "1. Identify the candidate's weak topics (return as a JSON array of strings).\n" +
            "2. Provide encouraging, constructive AI feedback and revision suggestions (return as a single string).\n\n" +
            "Incorrect answers:\n" + wrongAnswersText + "\n\n" +
            "Return ONLY a valid JSON object with the exact keys: \"weakTopics\" (array of strings) and \"aiFeedback\" (string). Do not return markdown fences.";
        
        String responseBody = callGeminiRaw(prompt, null);
        JsonObject response = gson.fromJson(responseBody, JsonObject.class);
        String text = extractGeneratedText(response);
        if (text == null) return new GeminiFeedbackResult("[]", "Keep practicing!");
        
        text = text.trim();
        if (text.startsWith("```json")) text = text.substring(7);
        else if (text.startsWith("```")) text = text.substring(3);
        if (text.endsWith("```")) text = text.substring(0, text.length() - 3);
        text = text.trim();
        
        try {
            JsonObject root = gson.fromJson(text, JsonObject.class);
            List<String> weakTopics = new ArrayList<>();
            if (root.has("weakTopics") && root.get("weakTopics").isJsonArray()) {
                 for (JsonElement el : root.getAsJsonArray("weakTopics")) {
                     weakTopics.add(el.getAsString());
                 }
            }
            String aiFeedback = root.has("aiFeedback") && !root.get("aiFeedback").isJsonNull() ? root.get("aiFeedback").getAsString() : "Keep practicing!";
            return new GeminiFeedbackResult(gson.toJson(weakTopics), aiFeedback);
        } catch(Exception e) {
            log.error("Failed to parse Gemini feedback", e);
            return new GeminiFeedbackResult("[]", "Keep practicing!");
        }
    }

    // ─────────────────────────────────────────
    // GENERATE CODING PROBLEM
    // Works for both topic and description input
    // ─────────────────────────────────────────

    public CodingProblemGenerated
            generateCodingProblem(
                String input,
                String inputType,
                String difficulty,
                int testCaseCount) {

        String prompt = buildCodingPrompt(
            input, inputType,
            difficulty, testCaseCount);

        String responseBody = callGeminiRaw(prompt, null);
        JsonObject response = gson.fromJson(responseBody, JsonObject.class);
        String responseText = extractGeneratedText(response);

        if (responseText == null) {
            throw new BadRequestException("AI returned no results. Please try again.");
        }

        return parseCodingProblem(responseText);
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

    private String buildCodingPrompt(
            String input,
            String inputType,
            String difficulty,
            int testCaseCount) {

        StringBuilder prompt = new StringBuilder();

        prompt.append(
            "You are an expert competitive " +
            "programming problem setter.\n\n");

        if ("TOPIC".equals(inputType)) {
            prompt.append(
                "Create a programming problem " +
                "about the following topic:\n");
            prompt.append("<topic>\n")
                .append(input)
                .append("\n</topic>\n\n");
        } else {
            prompt.append(
                "Create a programming problem " +
                "based on the following " +
                "description/requirements:\n");
            prompt.append("<description>\n")
                .append(input)
                .append("\n</description>\n\n");
        }

        if (difficulty != null
                && !difficulty.isEmpty()) {
            prompt.append(
                "Difficulty level: ")
                .append(difficulty)
                .append("\n\n");
        }

        prompt.append("<instructions>\n");
        prompt.append(
            "Generate a complete programming " +
            "problem with:\n");
        prompt.append(
            "- Clear problem statement\n");
        prompt.append(
            "- Input/output format\n");
        prompt.append(
            "- Constraints\n");
        prompt.append(
            "- " + testCaseCount
            + " test cases total\n");
        prompt.append(
            "  First test case: visible " +
            "(sample), rest: hidden\n");
        prompt.append(
            "- Expected outputs must be " +
            "EXACTLY correct\n");
        prompt.append(
            "- Use simple stdin/stdout format\n");
        prompt.append("</instructions>\n\n");

        prompt.append(
            "Return ONLY valid JSON. " +
            "No markdown, no extra text:\n");
        prompt.append("{\n");
        prompt.append(
            "  \"title\": \"problem title\",\n");
        prompt.append(
            "  \"description\": \"full problem " +
            "statement with input/output format\",\n");
        prompt.append(
            "  \"constraints\": \"constraints " +
            "like 1 <= n <= 10^5\",\n");
        prompt.append(
            "  \"sampleInput\": \"first test " +
            "case input\",\n");
        prompt.append(
            "  \"sampleOutput\": \"first test " +
            "case output\",\n");
        prompt.append(
            "  \"explanation\": \"explanation " +
            "of the sample\",\n");
        prompt.append(
            "  \"suggestedDifficulty\": " +
            "\"EASY or MEDIUM or HARD\",\n");
        prompt.append(
            "  \"suggestedMarks\": 10,\n");
        prompt.append(
            "  \"suggestedTimeLimit\": 2,\n");
        prompt.append(
            "  \"testCases\": [\n");
        prompt.append(
            "    {\n");
        prompt.append(
            "      \"input\": \"exact stdin input\",\n");
        prompt.append(
            "      \"expectedOutput\": " +
            "\"exact stdout output\",\n");
        prompt.append(
            "      \"isHidden\": false,\n");
        prompt.append(
            "      \"points\": 1\n");
        prompt.append(
            "    }\n");
        prompt.append(
            "  ]\n");
        prompt.append("}\n");

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

    private List<GeneratedQuestion> callGemini(String prompt, byte[] imageBytes) {
        String responseBody = callGeminiRaw(prompt, imageBytes);
        return parseGeminiResponse(responseBody);
    }

    private String getMimeType(byte[] bytes) {
        if (bytes != null && bytes.length >= 2) {
            if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8) {
                return "image/jpeg";
            }
        }
        return "image/png";
    }

    private String callGeminiRaw(
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
                imagePart.addProperty("mime_type", getMimeType(imageBytes));
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
                inlineData.addProperty("mime_type", getMimeType(imageBytes));
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

        int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try (Response response = client.newCall(request).execute()) {
                if (response.body() == null) {
                    throw new BadRequestException("Empty response from AI service");
                }

                String responseBody = response.body().string();

                if (!response.isSuccessful()) {
                    if (response.code() == 429 || response.code() >= 500) {
                        if (attempt < maxAttempts) {
                            log.warn("Gemini API error {}: {}. Retrying attempt {}/{}", response.code(), responseBody, attempt + 1, maxAttempts);
                            Thread.sleep(2000 * attempt); // Increased backoff
                            continue;
                        }
                    } else {
                        // Non-retryable 4xx
                        log.error("Gemini API non-retryable error {}: {}", response.code(), responseBody);
                        String reason = "Unknown error";
                        try {
                            JsonObject errorObj = gson.fromJson(responseBody, JsonObject.class);
                            if (errorObj.has("error") && errorObj.getAsJsonObject("error").has("message")) {
                                reason = errorObj.getAsJsonObject("error").get("message").getAsString();
                            }
                        } catch (Exception ignored) {}
                        throw new BadRequestException("AI request failed (" + response.code() + "): " + reason);
                    }
                    log.error("Gemini API error {}: {}", response.code(), responseBody);
                    if (response.code() == 429) {
                        throw new BadRequestException("Too many requests to the AI service. Please wait a moment and try again.");
                    }
                    throw new BadRequestException("AI service error " + response.code() + ". Please try again.");
                }

                return responseBody;

            } catch (java.net.SocketTimeoutException e) {
                log.error("Gemini connection timeout: {}", e.getMessage());
                throw new BadRequestException("AI took too long to respond. Try fewer questions or try again.");
            } catch (IOException e) {
                if (attempt < maxAttempts) {
                    log.warn("Gemini connection error: {}. Retrying attempt {}/{}", e.getMessage(), attempt + 1, maxAttempts);
                    try {
                        Thread.sleep(1000 * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    continue;
                }
                log.error("Gemini connection error: {}", e.getMessage());
                throw new BadRequestException("Could not connect to AI service. Please check your connection and try again.");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new BadRequestException("Request interrupted");
            }
        }
        throw new BadRequestException("Failed to call AI service after " + maxAttempts + " attempts.");
    }

    // ─────────────────────────────────────────
    // PARSE RESPONSE
    // ─────────────────────────────────────────

    private List<GeneratedQuestion> parseGeminiResponse(String responseBody) {
        JsonObject response = gson.fromJson(responseBody, JsonObject.class);

        String text = extractGeneratedText(response);

        if (text == null || text.trim().isEmpty()) {
            log.error("No valid text output found in Gemini response: {}", responseBody);
            throw new BadRequestException("AI returned no results. Please try again.");
        }

        // Clean markdown fences
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        
        int firstBracket = text.indexOf('[');
        int lastBracket = text.lastIndexOf(']');
        
        if (firstBracket >= 0 && lastBracket >= firstBracket) {
            text = text.substring(firstBracket, lastBracket + 1);
        } else {
            // Check if it's a JSON object with an array field
            try {
                int firstBrace = text.indexOf('{');
                int lastBrace = text.lastIndexOf('}');
                if (firstBrace >= 0 && lastBrace >= firstBrace) {
                    String objText = text.substring(firstBrace, lastBrace + 1);
                    JsonObject root = gson.fromJson(objText, JsonObject.class);
                    for (Map.Entry<String, JsonElement> entry : root.entrySet()) {
                        if (entry.getValue().isJsonArray()) {
                            text = entry.getValue().getAsJsonArray().toString();
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        JsonArray questions = null;
        try {
            questions = gson.fromJson(text, JsonArray.class);
        } catch (Exception e) {
            // Truncated JSON recovery
            log.warn("Failed to parse JSON, attempting truncated recovery");
            int lastCompleteBrace = text.lastIndexOf('}');
            if (lastCompleteBrace >= 0) {
                String salvaged = text.substring(0, lastCompleteBrace + 1) + "]";
                try {
                    questions = gson.fromJson(salvaged, JsonArray.class);
                } catch (Exception e2) {
                    throw new BadRequestException("AI returned unexpected format. Please try again.");
                }
            } else {
                throw new BadRequestException("AI returned unexpected format. Please try again.");
            }
        }
        
        if (questions == null) {
            throw new BadRequestException("AI returned unexpected format. Please try again.");
        }

        List<GeneratedQuestion> result = new ArrayList<>();
        int malformedCount = 0;

        for (JsonElement elem : questions) {
            try {
                JsonObject q = elem.getAsJsonObject();
                
                // Parse tolerance safely
                double tolerance = 0.0;
                if (q.has("tolerance") && !q.get("tolerance").isJsonNull()) {
                    try {
                        tolerance = q.get("tolerance").getAsDouble();
                        if (tolerance < 0) tolerance = 0.0;
                    } catch (Exception ignored) {}
                }

                result.add(
                    GeneratedQuestion.builder()
                        .questionText(getStr(q, "questionText"))
                        .type(getStr(q, "type"))
                        .difficulty(getStr(q, "difficulty"))
                        .optionA(getStr(q, "optionA"))
                        .optionB(getStr(q, "optionB"))
                        .optionC(getStr(q, "optionC"))
                        .optionD(getStr(q, "optionD"))
                        .correctAnswer(getStr(q, "correctAnswer"))
                        .explanation(getStr(q, "explanation"))
                        .topic(getStr(q, "topic"))
                        .tolerance(tolerance)
                        .build());
            } catch (Exception e) {
                log.warn("Skipping malformed question element: {}", elem);
                malformedCount++;
            }
        }
        
        if (result.isEmpty()) {
            throw new BadRequestException("AI returned no usable questions. Please try again.");
        }

        return result;
    }

    private CodingProblemGenerated
            parseCodingProblem(String text) {

        // Clean markdown if present
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

        try {
            JsonObject obj = gson.fromJson(
                text, JsonObject.class);

            CodingProblemGenerated problem =
                new CodingProblemGenerated();

            problem.setTitle(
                getStr(obj, "title"));
            problem.setDescription(
                getStr(obj, "description"));
            problem.setConstraints(
                getStr(obj, "constraints"));
            problem.setSampleInput(
                getStr(obj, "sampleInput"));
            problem.setSampleOutput(
                getStr(obj, "sampleOutput"));
            problem.setExplanation(
                getStr(obj, "explanation"));
            problem.setSuggestedDifficulty(
                getStr(obj, "suggestedDifficulty"));

            if (obj.has("suggestedMarks")
                    && !obj.get("suggestedMarks")
                        .isJsonNull()) {
                problem.setSuggestedMarks(
                    obj.get("suggestedMarks")
                        .getAsDouble());
            }

            if (obj.has("suggestedTimeLimit")
                    && !obj.get("suggestedTimeLimit")
                        .isJsonNull()) {
                problem.setSuggestedTimeLimit(
                    obj.get("suggestedTimeLimit")
                        .getAsInt());
            }

            // Parse test cases
            if (obj.has("testCases")
                    && !obj.get("testCases")
                        .isJsonNull()) {
                List<com.assessmate.dto.TestCaseRequest> testCases =
                    new ArrayList<>();
                JsonArray tcs =
                    obj.getAsJsonArray("testCases");
                for (JsonElement elem : tcs) {
                    JsonObject tc =
                        elem.getAsJsonObject();
                    com.assessmate.dto.TestCaseRequest tcReq =
                        new com.assessmate.dto.TestCaseRequest();
                    tcReq.setInput(
                        getStr(tc, "input"));
                    tcReq.setExpectedOutput(
                        getStr(tc, "expectedOutput"));
                    tcReq.setIsHidden(
                        tc.has("isHidden")
                        && !tc.get("isHidden")
                            .isJsonNull()
                        ? tc.get("isHidden")
                            .getAsBoolean()
                        : true);
                    tcReq.setPoints(
                        tc.has("points")
                        && !tc.get("points")
                            .isJsonNull()
                        ? tc.get("points").getAsInt()
                        : 1);
                    testCases.add(tcReq);
                }
                problem.setTestCases(testCases);
            }

            return problem;

        } catch (Exception e) {
            log.error(
                "Failed to parse coding problem: {}",
                e.getMessage());
            throw new BadRequestException(
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

        // Check for finishReason / blockReason
        if (response.has("promptFeedback")) {
            JsonObject promptFeedback = response.getAsJsonObject("promptFeedback");
            if (promptFeedback.has("blockReason") && !promptFeedback.get("blockReason").isJsonNull()) {
                throw new BadRequestException("AI prompt blocked: " + promptFeedback.get("blockReason").getAsString());
            }
        }

        // 3. Candidates (Classic generateContent API)
        if (response.has("candidates") && response.get("candidates").isJsonArray()) {
            JsonArray candidates = response.getAsJsonArray("candidates");
            if (candidates.size() == 0) {
                throw new BadRequestException("AI request returned no candidates. This may be due to safety filters.");
            }
            JsonObject first = candidates.get(0).getAsJsonObject();
            
            if (first.has("finishReason") && !first.get("finishReason").isJsonNull()) {
                String finishReason = first.get("finishReason").getAsString();
                if (finishReason.equals("SAFETY") || finishReason.equals("RECITATION") || finishReason.equals("OTHER")) {
                    throw new BadRequestException("AI response blocked due to: " + finishReason);
                }
            }

            if (first.has("content") && first.getAsJsonObject("content").has("parts")) {
                JsonArray parts = first.getAsJsonObject("content").getAsJsonArray("parts");
                StringBuilder sb = new StringBuilder();
                for (JsonElement p : parts) {
                    JsonObject pObj = p.getAsJsonObject();
                    if (pObj.has("thought") && pObj.get("thought").getAsBoolean()) {
                        continue;
                    }
                    if (pObj.has("text") && !pObj.get("text").isJsonNull()) {
                        sb.append(pObj.get("text").getAsString());
                    }
                }
                if (sb.length() > 0) return sb.toString();
            }
        }

        return null;
    }

    private String getStr(JsonObject obj, String key) {
        if (!obj.has(key) || obj.get(key).isJsonNull()) {
            return null;
        }
        JsonElement el = obj.get(key);
        if (el.isJsonArray()) {
            List<String> list = new ArrayList<>();
            for (JsonElement item : el.getAsJsonArray()) {
                list.add(item.getAsString());
            }
            return String.join(",", list);
        } else if (el.isJsonObject()) {
            return el.toString();
        } else {
            return el.getAsString();
        }
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

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class GeminiFeedbackResult {
        private String weakTopicsJson;
        private String aiFeedback;
    }

    // Inner class for generated problem
    @lombok.Data
    public static class CodingProblemGenerated {
        private String title;
        private String description;
        private String constraints;
        private String sampleInput;
        private String sampleOutput;
        private String explanation;
        private String suggestedDifficulty;
        private Double suggestedMarks;
        private Integer suggestedTimeLimit;
        private List<com.assessmate.dto.TestCaseRequest> testCases;
    }
}


