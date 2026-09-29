package com.karsaaz.studyloop.identity.infra;

import java.util.Properties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class MailConfig {
  @Bean
  @ConditionalOnMissingBean(JavaMailSender.class)
  JavaMailSender javaMailSender() {
    JavaMailSenderImpl sender = new JavaMailSenderImpl();
    sender.setHost("localhost");
    sender.setPort(1025);
    Properties props = sender.getJavaMailProperties();
    props.put("mail.smtp.auth", "false");
    props.put("mail.smtp.starttls.enable", "false");
    return sender;
  }
}
