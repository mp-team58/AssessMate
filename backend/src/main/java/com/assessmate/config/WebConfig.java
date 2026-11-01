package com.assessmate.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Only public question resources are served statically
        // Private proctoring evidence is served via protected controller with authentication & authorization
        registry
                .addResourceHandler("/uploads/questions/**")
                .addResourceLocations("file:uploads/questions/");
    }
}
