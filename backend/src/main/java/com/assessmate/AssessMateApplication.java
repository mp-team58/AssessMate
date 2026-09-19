package com.assessmate;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AssessMateApplication {

	public static void main(String[] args) {
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
		
		// If launched from the root workspace directory, the .env might not be found. 
		// Check the backend/ folder as a fallback.
		if (dotenv.entries().isEmpty()) {
			dotenv = Dotenv.configure().directory("./backend").ignoreIfMissing().load();
		}

		dotenv.entries().forEach(entry -> {
			if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
				System.setProperty(entry.getKey(), entry.getValue());
			}
		});

		SpringApplication.run(AssessMateApplication.class, args);
	}

}
