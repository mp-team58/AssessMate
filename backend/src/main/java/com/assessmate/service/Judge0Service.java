package com.assessmate.service;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
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
public class Judge0Service {

    public static final int DEFAULT_CPU_TIME_LIMIT = 3;
    public static final int MAX_CPU_TIME_LIMIT = 10;
    public static final int MIN_CPU_TIME_LIMIT = 1;

    public static final int DEFAULT_MEMORY_LIMIT_MB = 128;
    public static final int MAX_MEMORY_LIMIT_MB = 256;
    public static final int MIN_MEMORY_LIMIT_MB = 32;

    public static final int MAX_SOURCE_CODE_SIZE = 65536; // 64 KB
    public static final int MAX_INPUT_SIZE = 10240; // 10 KB
    public static final int MAX_FILE_SIZE_KB = 1024; // 1 MB output limit

    @Value("${judge0.api.url:https://ce.judge0.com}")
    private String apiUrl;

    @Value("${judge0.api.key:}")
    private String apiKey;

    @Value("${judge0.auth-header:X-Auth-Token}")
    private String authHeader;

    @Value("${judge0.connect-timeout-ms:10000}")
    private long connectTimeoutMs;

    @Value("${judge0.read-timeout-ms:20000}")
    private long readTimeoutMs;

    @Value("${judge0.write-timeout-ms:10000}")
    private long writeTimeoutMs;

    private OkHttpClient httpClient;

    public void setHttpClient(OkHttpClient httpClient) {
        this.httpClient = httpClient;
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

    private final Gson gson = new Gson();

    public RunCodeResponse runCode(
            String sourceCode,
            Language language,
            String input,
            String expectedOutput,
            int timeLimitSeconds,
            int memoryLimitMb) {

        validateSourceCodeSize(sourceCode);
        validateInputSize(input);

        try {
            Judge0Result result = executeCode(
                sourceCode, language, input,
                timeLimitSeconds, memoryLimitMb);

            String stdout = result.getStdout() != null
                ? result.getStdout().trim() : "";
            String expected = expectedOutput != null
                ? expectedOutput.trim() : "";

            boolean passed = stdout.equals(expected);

            return RunCodeResponse.builder()
                .status(mapStatus(result.getStatusId()))
                .stdout(stdout)
                .stderr(result.getStderr())
                .compileOutput(result.getCompileOutput())
                .expectedOutput(expectedOutput)
                .executionTimeMs(parseTime(result.getTime()))
                .memoryUsedKb(result.getMemory())
                .passed(passed)
                .build();

        } catch (IOException e) {
            log.error("Judge0 connection error: {}", e.getMessage());
            throw new BadRequestException(
                "Code execution service unavailable. Please try again.");
        }
    }

    public List<TestCaseResult> submitCode(
            String sourceCode,
            Language language,
            List<TestCase> testCases,
            int timeLimitSeconds,
            int memoryLimitMb,
            CodeSubmission submission) {

        validateSourceCodeSize(sourceCode);
        if (testCases != null) {
            for (TestCase tc : testCases) {
                validateInputSize(tc.getInput());
            }
        }

        List<TestCaseResult> results = new ArrayList<>();

        for (TestCase testCase : testCases) {
            try {
                Judge0Result result = executeCode(
                    sourceCode, language,
                    testCase.getInput(),
                    timeLimitSeconds,
                    memoryLimitMb);

                String actual = result.getStdout() != null
                    ? result.getStdout().trim()
                    : "";
                String expected = testCase.getExpectedOutput() != null
                    ? testCase.getExpectedOutput().trim()
                    : "";

                SubmissionStatus status;
                if (result.getStatusId() == 3) {
                    status = actual.equals(expected)
                        ? SubmissionStatus.ACCEPTED
                        : SubmissionStatus.WRONG;
                } else {
                    status = mapSubmissionStatus(result.getStatusId());
                }

                results.add(
                    TestCaseResult.builder()
                        .submission(submission)
                        .testCase(testCase)
                        .status(status)
                        .actualOutput(actual)
                        .executionTimeMs(parseTime(result.getTime()))
                        .memoryUsedKb(result.getMemory())
                        .isHidden(testCase.getIsHidden())
                        .build());

            } catch (IOException e) {
                log.error("Test case {} execution failed: {}",
                    testCase.getId(), e.getMessage());

                results.add(
                    TestCaseResult.builder()
                        .submission(submission)
                        .testCase(testCase)
                        .status(SubmissionStatus.RE)
                        .actualOutput("")
                        .isHidden(testCase.getIsHidden())
                        .build());
            }
        }

        return results;
    }

    private Judge0Result executeCode(
            String sourceCode,
            Language language,
            String input,
            int timeLimitSeconds,
            int memoryLimitMb)
            throws IOException {

        if (language == null || language.getJudge0Id() <= 0) {
            throw new BadRequestException("Unsupported or invalid programming language.");
        }

        // Enforce backend bounds - candidate/host request cannot exceed safe limits
        int safeTimeLimit = Math.min(Math.max(timeLimitSeconds > 0 ? timeLimitSeconds : DEFAULT_CPU_TIME_LIMIT, MIN_CPU_TIME_LIMIT), MAX_CPU_TIME_LIMIT);
        int safeMemoryMb = Math.min(Math.max(memoryLimitMb > 0 ? memoryLimitMb : DEFAULT_MEMORY_LIMIT_MB, MIN_MEMORY_LIMIT_MB), MAX_MEMORY_LIMIT_MB);

        JsonObject body = new JsonObject();
        body.addProperty("source_code", sourceCode);
        body.addProperty("language_id", language.getJudge0Id());

        if (input != null && !input.trim().isEmpty()) {
            body.addProperty("stdin", input);
        }

        // P6: Enforced Resource Limits
        body.addProperty("cpu_time_limit", safeTimeLimit);
        body.addProperty("wall_time_limit", safeTimeLimit * 2);
        body.addProperty("cpu_extra_time", 1.0);
        body.addProperty("memory_limit", safeMemoryMb * 1024);
        body.addProperty("max_file_size", MAX_FILE_SIZE_KB);
        body.addProperty("max_processes_and_or_threads", 60);

        // P6: Explicit network isolation request
        body.addProperty("enable_network", false);

        String url = apiUrl + "/submissions?wait=true";

        Request.Builder reqBuilder = new Request.Builder()
            .url(url)
            .post(RequestBody.create(
                gson.toJson(body),
                MediaType.parse("application/json")));

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            if (apiUrl != null && apiUrl.contains("rapidapi.com")) {
                reqBuilder.addHeader("X-RapidAPI-Key", apiKey);
                reqBuilder.addHeader("X-RapidAPI-Host", "judge0-ce.p.rapidapi.com");
            } else {
                String header = (authHeader != null && !authHeader.trim().isEmpty()) ? authHeader : "X-Auth-Token";
                reqBuilder.addHeader(header, apiKey);
            }
        }

        Request request = reqBuilder.build();

        try (Response response = getClient().newCall(request).execute()) {

            if (response.body() == null) {
                throw new IOException("Empty response from Judge0");
            }

            String responseBody = response.body().string();

            if (!response.isSuccessful()) {
                log.error("Judge0 error {}: {}", response.code(), responseBody);
                throw new IOException("Judge0 returned error: " + response.code());
            }

            return parseResult(gson.fromJson(responseBody, JsonObject.class));
        }
    }

    private Judge0Result parseResult(JsonObject obj) {
        Judge0Result result = new Judge0Result();

        if (obj.has("status")
                && !obj.get("status").isJsonNull()
                && obj.get("status").isJsonObject()) {
            JsonObject statusObj = obj.getAsJsonObject("status");
            if (statusObj.has("id") && !statusObj.get("id").isJsonNull()) {
                result.setStatusId(statusObj.get("id").getAsInt());
            }
        } else if (obj.has("status_id") && !obj.get("status_id").isJsonNull()) {
            result.setStatusId(obj.get("status_id").getAsInt());
        }

        result.setStdout(getPlainField(obj, "stdout"));
        result.setStderr(getPlainField(obj, "stderr"));
        result.setCompileOutput(getPlainField(obj, "compile_output"));

        if (obj.has("time") && !obj.get("time").isJsonNull()) {
            result.setTime(obj.get("time").getAsString());
        }

        if (obj.has("memory") && !obj.get("memory").isJsonNull()) {
            result.setMemory(obj.get("memory").getAsInt());
        }

        return result;
    }

    private String getPlainField(JsonObject obj, String field) {
        if (!obj.has(field) || obj.get(field).isJsonNull()) {
            return null;
        }
        return obj.get(field).getAsString();
    }

    private String mapStatus(int statusId) {
        return switch (statusId) {
            case 3 -> "ACCEPTED";
            case 4 -> "WRONG";
            case 5 -> "TLE";
            case 6 -> "CE";
            case 7, 8, 9, 10, 11, 12, 13, 14 -> "RE";
            default -> "RE";
        };
    }

    private SubmissionStatus mapSubmissionStatus(int statusId) {
        return switch (statusId) {
            case 3 -> SubmissionStatus.ACCEPTED;
            case 4 -> SubmissionStatus.WRONG;
            case 5 -> SubmissionStatus.TLE;
            case 6 -> SubmissionStatus.CE;
            case 7, 8, 9, 10, 11, 12, 13, 14 -> SubmissionStatus.RE;
            default -> SubmissionStatus.RE;
        };
    }

    private Double parseTime(String time) {
        if (time == null) return null;
        try {
            return Double.parseDouble(time) * 1000;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void validateSourceCodeSize(String sourceCode) {
        if (sourceCode == null || sourceCode.trim().isEmpty()) {
            throw new BadRequestException("Source code cannot be empty.");
        }
        if (sourceCode.length() > MAX_SOURCE_CODE_SIZE) {
            throw new BadRequestException("Source code exceeds maximum allowed size of 64KB.");
        }
    }

    private void validateInputSize(String input) {
        if (input != null && input.length() > MAX_INPUT_SIZE) {
            throw new BadRequestException("Input exceeds maximum allowed size of 10KB.");
        }
    }

    @lombok.Data
    private static class Judge0Result {
        private int statusId;
        private String stdout;
        private String stderr;
        private String compileOutput;
        private String time;
        private Integer memory;
    }
}
