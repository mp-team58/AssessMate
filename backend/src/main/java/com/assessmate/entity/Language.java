package com.assessmate.entity;

import lombok.Getter;

@Getter
public enum Language {
    PYTHON(71, "Python"),
    JAVA(62, "Java"),
    CPP(54, "C++"),
    C(50, "C"),
    JAVASCRIPT(63, "JavaScript");

    private final int judge0Id;
    private final String displayName;

    Language(int judge0Id, String displayName) {
        this.judge0Id = judge0Id;
        this.displayName = displayName;
    }

    public static Language fromName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Language name cannot be null or empty");
        }
        String clean = name.trim();
        String normalized = clean.toUpperCase()
                .replace("+", "P")
                .replace("#", "SHARP");

        if ("CPP".equalsIgnoreCase(normalized) || "C++".equalsIgnoreCase(clean)) {
            return CPP;
        }
        if ("JS".equalsIgnoreCase(normalized) || "NODEJS".equalsIgnoreCase(normalized) || "NODE".equalsIgnoreCase(normalized)) {
            return JAVASCRIPT;
        }
        if ("PY".equalsIgnoreCase(normalized) || "PYTHON3".equalsIgnoreCase(normalized)) {
            return PYTHON;
        }

        for (Language lang : values()) {
            if (lang.name().equalsIgnoreCase(normalized) || lang.displayName.equalsIgnoreCase(clean)) {
                return lang;
            }
        }

        return Language.valueOf(normalized);
    }
}
