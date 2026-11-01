package com.assessmate.service;

import com.assessmate.dto.RunCodeResponse;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import okhttp3.*;
import okio.Buffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class Judge0ServiceSecurityTest {

    private Judge0Service judge0Service;
    private final Gson gson = new Gson();

    @BeforeEach
    void setUp() {
        judge0Service = new Judge0Service();
        ReflectionTestUtils.setField(judge0Service, "apiUrl", "https://ce.judge0.com");
        ReflectionTestUtils.setField(judge0Service, "apiKey", "");
        ReflectionTestUtils.setField(judge0Service, "authHeader", "X-Auth-Token");
    }

    private OkHttpClient createMockClient(int responseCode, String responseBody, AtomicReference<Request> capturedRequest) {
        return new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    Request req = chain.request();
                    if (capturedRequest != null) {
                        capturedRequest.set(req);
                    }
                    return new Response.Builder()
                            .request(req)
                            .protocol(Protocol.HTTP_1_1)
                            .code(responseCode)
                            .message("OK")
                            .body(ResponseBody.create(responseBody, MediaType.get("application/json")))
                            .build();
                })
                .build();
    }

    private String readRequestBody(Request request) throws IOException {
        if (request.body() == null) return "";
        Buffer buffer = new Buffer();
        request.body().writeTo(buffer);
        return buffer.readUtf8();
    }

    @Test
    @DisplayName("1. Valid code submission returns accepted status")
    void validCodeSubmission_Accepted() {
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"Hello World\\n\",\"time\":\"0.05\",\"memory\":2048}";
        judge0Service.setHttpClient(createMockClient(200, successJson, null));

        RunCodeResponse resp = judge0Service.runCode(
                "print('Hello World')",
                Language.PYTHON,
                "",
                "Hello World",
                2,
                128
        );

        assertNotNull(resp);
        assertEquals("ACCEPTED", resp.getStatus());
        assertTrue(resp.isPassed());
        assertEquals("Hello World", resp.getStdout());
        assertEquals(50.0, resp.getExecutionTimeMs());
        assertEquals(2048, resp.getMemoryUsedKb());
    }

    @Test
    @DisplayName("2. Invalid or null language is rejected with BadRequestException")
    void invalidLanguage_Rejected() {
        assertThrows(BadRequestException.class, () ->
                judge0Service.runCode("print(1)", null, "", "", 2, 128));
    }

    @Test
    @DisplayName("3. Source code exceeding 64KB is rejected")
    void sourceCodeSizeLimit_Rejected() {
        String longCode = "a".repeat(Judge0Service.MAX_SOURCE_CODE_SIZE + 1);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                judge0Service.runCode(longCode, Language.PYTHON, "", "", 2, 128));

        assertTrue(ex.getMessage().contains("exceeds maximum allowed size of 64KB"));
    }

    @Test
    @DisplayName("4. Custom input exceeding 10KB is rejected")
    void inputSizeLimit_Rejected() {
        String longInput = "x".repeat(Judge0Service.MAX_INPUT_SIZE + 1);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                judge0Service.runCode("print(input())", Language.PYTHON, longInput, "", 2, 128));

        assertTrue(ex.getMessage().contains("exceeds maximum allowed size of 10KB"));
    }

    @Test
    @DisplayName("5. CPU and memory limits are enforced with default safe bounds")
    void cpuAndMemoryLimits_Enforced() throws IOException {
        AtomicReference<Request> capturedReq = new AtomicReference<>();
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"ok\"}";
        judge0Service.setHttpClient(createMockClient(200, successJson, capturedReq));

        judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 0, 0);

        assertNotNull(capturedReq.get());
        String bodyStr = readRequestBody(capturedReq.get());
        JsonObject body = gson.fromJson(bodyStr, JsonObject.class);

        assertEquals(Judge0Service.DEFAULT_CPU_TIME_LIMIT, body.get("cpu_time_limit").getAsInt());
        assertEquals(Judge0Service.DEFAULT_MEMORY_LIMIT_MB * 1024, body.get("memory_limit").getAsInt());
        assertEquals(Judge0Service.MAX_FILE_SIZE_KB, body.get("max_file_size").getAsInt());
    }

    @Test
    @DisplayName("6. Candidate or question cannot override execution limits beyond MAX threshold")
    void cannotOverrideExecutionLimitsBeyondMax_Clamped() throws IOException {
        AtomicReference<Request> capturedReq = new AtomicReference<>();
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"ok\"}";
        judge0Service.setHttpClient(createMockClient(200, successJson, capturedReq));

        // Attempt to pass 3600 seconds and 100GB of RAM
        judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 3600, 100000);

        assertNotNull(capturedReq.get());
        String bodyStr = readRequestBody(capturedReq.get());
        JsonObject body = gson.fromJson(bodyStr, JsonObject.class);

        assertEquals(Judge0Service.MAX_CPU_TIME_LIMIT, body.get("cpu_time_limit").getAsInt());
        assertEquals(Judge0Service.MAX_MEMORY_LIMIT_MB * 1024, body.get("memory_limit").getAsInt());
    }

    @Test
    @DisplayName("7. Hidden test cases remain protected in TestCaseResult list")
    void hiddenTestCases_RemainProtected() {
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"secret_output\"}";
        judge0Service.setHttpClient(createMockClient(200, successJson, null));

        TestCase publicTc = TestCase.builder().id(1L).input("in1").expectedOutput("out1").isHidden(false).build();
        TestCase hiddenTc = TestCase.builder().id(2L).input("secret_in").expectedOutput("secret_out").isHidden(true).build();

        CodeSubmission sub = CodeSubmission.builder().id(10L).build();

        List<TestCaseResult> results = judge0Service.submitCode(
                "print('secret_output')",
                Language.PYTHON,
                List.of(publicTc, hiddenTc),
                2,
                128,
                sub
        );

        assertEquals(2, results.size());
        assertFalse(results.get(0).getIsHidden());
        assertTrue(results.get(1).getIsHidden());
    }

    @Test
    @DisplayName("8. Judge0 authentication header is sent when API key is configured")
    void judge0AuthHeader_SentWhenConfigured() {
        ReflectionTestUtils.setField(judge0Service, "apiKey", "my-secret-judge0-api-token");
        ReflectionTestUtils.setField(judge0Service, "authHeader", "X-Auth-Token");

        AtomicReference<Request> capturedReq = new AtomicReference<>();
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"ok\"}";
        judge0Service.setHttpClient(createMockClient(200, successJson, capturedReq));

        judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 2, 128);

        assertNotNull(capturedReq.get());
        assertEquals("my-secret-judge0-api-token", capturedReq.get().header("X-Auth-Token"));
    }

    @Test
    @DisplayName("9. Judge0 network timeout is handled gracefully without leaking details")
    void judge0Timeout_HandledGracefully() {
        OkHttpClient timeoutClient = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    throw new SocketTimeoutException("Read timed out");
                })
                .build();
        judge0Service.setHttpClient(timeoutClient);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 2, 128));

        assertEquals("Code execution service unavailable. Please try again.", ex.getMessage());
    }

    @Test
    @DisplayName("10. Judge0 unavailable service (HTTP 503) handled gracefully")
    void judge0UnavailableService_HandledGracefully() {
        judge0Service.setHttpClient(createMockClient(503, "Service Unavailable", null));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 2, 128));

        assertEquals("Code execution service unavailable. Please try again.", ex.getMessage());
    }

    @Test
    @DisplayName("11. API key never appears in execution responses or client-facing DTOs")
    void apiKeyNeverAppearsInResponses() {
        ReflectionTestUtils.setField(judge0Service, "apiKey", "super-secret-key-999");
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"ok\"}";
        judge0Service.setHttpClient(createMockClient(200, successJson, null));

        RunCodeResponse resp = judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 2, 128);

        String responseString = resp.toString();
        assertFalse(responseString.contains("super-secret-key-999"), "API Key must not leak in response");
    }

    @Test
    @DisplayName("12. Network isolation parameter (enable_network: false) is sent in Judge0 submission")
    void networkIsolationParameter_SentInSubmission() throws IOException {
        AtomicReference<Request> capturedReq = new AtomicReference<>();
        String successJson = "{\"status\":{\"id\":3},\"stdout\":\"ok\"}";
        judge0Service.setHttpClient(createMockClient(200, successJson, capturedReq));

        judge0Service.runCode("print('ok')", Language.PYTHON, "", "ok", 2, 128);

        assertNotNull(capturedReq.get());
        String bodyStr = readRequestBody(capturedReq.get());
        JsonObject body = gson.fromJson(bodyStr, JsonObject.class);

        assertTrue(body.has("enable_network"), "Body must contain enable_network parameter");
        assertFalse(body.get("enable_network").getAsBoolean(), "enable_network must be explicitly false");
    }
}
