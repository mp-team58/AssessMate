package com.assessmate.repository;

import com.assessmate.dto.CodingQuestionResponse;
import com.assessmate.dto.ExamResponse;
import com.assessmate.dto.QuestionResponse;
import com.assessmate.entity.*;
import com.assessmate.service.CodingQuestionService;
import com.assessmate.service.ExamService;
import com.assessmate.service.QuestionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.cdimascio.dotenv.Dotenv;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class JpaFetchOptimizationTest {

    static {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(entry -> {
            if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                System.setProperty(entry.getKey(), entry.getValue());
            }
        });
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CodingQuestionRepository codingQuestionRepository;

    @Autowired
    private TestCaseRepository testCaseRepository;

    @Autowired
    private ExamService examService;

    @Autowired
    private QuestionService questionService;

    @Autowired
    private CodingQuestionService codingQuestionService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private ObjectMapper objectMapper;

    private TransactionTemplate txTemplate;

    private User hostUser;
    private Exam testExam;
    private Question mcqQuestion;
    private CodingQuestion codingQuestion;
    private TestCase testCase;

    @BeforeEach
    void setUp() {
        txTemplate = new TransactionTemplate(transactionManager);

        txTemplate.execute(status -> {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            hostUser = User.builder()
                    .name("Test Host " + suffix)
                    .email("host_" + suffix + "@assessmate.test")
                    .password("Hash123!")
                    .role(Role.HOST)
                    .status(AccountStatus.ACTIVE)
                    .build();
            userRepository.save(hostUser);

            testExam = Exam.builder()
                    .host(hostUser)
                    .title("Fetch Optimization Exam " + suffix)
                    .subject("Computer Science")
                    .scheduledStart(LocalDateTime.now().plusDays(1))
                    .joinCode("FO" + suffix.toUpperCase())
                    .status(ExamStatus.DRAFT)
                    .build();
            examRepository.save(testExam);

            mcqQuestion = Question.builder()
                    .exam(testExam)
                    .createdBy(hostUser)
                    .questionText("What is the time complexity of binary search?")
                    .type(QuestionType.SINGLE_CHOICE)
                    .difficulty(Difficulty.EASY)
                    .optionA("O(1)")
                    .optionB("O(log n)")
                    .optionC("O(n)")
                    .optionD("O(n log n)")
                    .correctAnswer("B")
                    .marks(1.0)
                    .isGlobal(true)
                    .build();
            questionRepository.save(mcqQuestion);

            codingQuestion = CodingQuestion.builder()
                    .exam(testExam)
                    .createdBy(hostUser)
                    .title("Reverse a String")
                    .description("Given a string, return it reversed.")
                    .sampleInput("hello")
                    .sampleOutput("olleh")
                    .allowedLanguages("PYTHON,JAVA,JAVASCRIPT")
                    .marks(10.0)
                    .isGlobal(false)
                    .build();
            codingQuestionRepository.save(codingQuestion);

            testCase = TestCase.builder()
                    .codingQuestion(codingQuestion)
                    .input("world")
                    .expectedOutput("dlrow")
                    .isHidden(false)
                    .points(5)
                    .build();
            testCaseRepository.save(testCase);

            return null;
        });
    }

    @Test
    @DisplayName("1. Exam.host is LAZY by default on findById and EAGER via findWithHostById")
    void testExamHostLazyLoading() {
        txTemplate.execute(status -> {
            // findById loads exam with host as uninitialized lazy proxy
            Exam exam = examRepository.findById(testExam.getId()).orElseThrow();
            assertNotNull(exam);
            assertFalse(Hibernate.isInitialized(exam.getHost()), "Exam.host should be an uninitialized proxy on findById");

            // findWithHostById loads exam with host initialized via EntityGraph
            Exam examWithHost = examRepository.findWithHostById(testExam.getId()).orElseThrow();
            assertNotNull(examWithHost);
            assertTrue(Hibernate.isInitialized(examWithHost.getHost()), "Exam.host should be initialized via findWithHostById");
            assertEquals(hostUser.getName(), examWithHost.getHost().getName());

            return null;
        });
    }

    @Test
    @DisplayName("2. Question.exam is LAZY while Question.createdBy is loaded via EntityGraph")
    void testQuestionLazyAndEntityGraph() {
        txTemplate.execute(status -> {
            List<Question> questions = questionRepository.findByExamId(testExam.getId());
            assertFalse(questions.isEmpty());

            Question q = questions.get(0);
            assertFalse(Hibernate.isInitialized(q.getExam()), "Question.exam should remain an uninitialized lazy proxy");
            assertTrue(Hibernate.isInitialized(q.getCreatedBy()), "Question.createdBy should be initialized via EntityGraph");
            assertEquals(hostUser.getName(), q.getCreatedBy().getName());

            return null;
        });
    }

    @Test
    @DisplayName("3. CodingQuestion.exam is LAZY while CodingQuestion.createdBy is loaded via EntityGraph")
    void testCodingQuestionLazyAndEntityGraph() {
        txTemplate.execute(status -> {
            List<CodingQuestion> codingQuestions = codingQuestionRepository.findByExamId(testExam.getId());
            assertFalse(codingQuestions.isEmpty());

            CodingQuestion cq = codingQuestions.get(0);
            assertFalse(Hibernate.isInitialized(cq.getExam()), "CodingQuestion.exam should remain an uninitialized lazy proxy");
            assertTrue(Hibernate.isInitialized(cq.getCreatedBy()), "CodingQuestion.createdBy should be initialized via EntityGraph");
            assertEquals(hostUser.getName(), cq.getCreatedBy().getName());

            return null;
        });
    }

    @Test
    @DisplayName("4. TestCase.codingQuestion is LAZY and avoids loading question/exam hierarchy")
    void testTestCaseLazyRelationship() {
        txTemplate.execute(status -> {
            List<TestCase> testCases = testCaseRepository.findByCodingQuestionId(codingQuestion.getId());
            assertFalse(testCases.isEmpty());

            TestCase tc = testCases.get(0);
            assertFalse(Hibernate.isInitialized(tc.getCodingQuestion()), "TestCase.codingQuestion should be an uninitialized lazy proxy");
            assertEquals("world", tc.getInput());
            assertEquals("dlrow", tc.getExpectedOutput());

            return null;
        });
    }

    @Test
    @DisplayName("5. DTO mapping and serialization succeed without LazyInitializationException")
    void testDtoMappingAndSerialization() {
        txTemplate.execute(status -> {
            Exam exam = examRepository.findWithHostById(testExam.getId()).orElseThrow();
            ExamResponse examResponse = examService.mapToResponse(exam);
            assertNotNull(examResponse);
            assertEquals(hostUser.getName(), examResponse.getHostName());

            List<Question> questions = questionRepository.findByExamId(testExam.getId());
            QuestionResponse questionResponse = questionService.mapToResponse(questions.get(0));
            assertNotNull(questionResponse);
            assertEquals(testExam.getId(), questionResponse.getExamId());
            assertEquals(hostUser.getName(), questionResponse.getCreatedByName());

            List<CodingQuestion> cqs = codingQuestionRepository.findByExamId(testExam.getId());
            CodingQuestionResponse cqResponse = codingQuestionService.mapToResponse(cqs.get(0), true);
            assertNotNull(cqResponse);
            assertEquals(testExam.getId(), cqResponse.getExamId());
            assertEquals(hostUser.getName(), cqResponse.getCreatedByName());
            assertEquals(1, cqResponse.getTestCases().size());

            // Verify Jackson JSON serialization works cleanly
            assertDoesNotThrow(() -> {
                String examJson = objectMapper.writeValueAsString(examResponse);
                String questionJson = objectMapper.writeValueAsString(questionResponse);
                String cqJson = objectMapper.writeValueAsString(cqResponse);
                assertNotNull(examJson);
                assertNotNull(questionJson);
                assertNotNull(cqJson);
            });

            return null;
        });
    }
}

