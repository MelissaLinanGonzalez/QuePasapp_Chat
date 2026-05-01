package com.melissa.chat_BackEnd.repository;

import com.melissa.chat_BackEnd.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    ChatMessage findByIdMensaje(String idMensaje);
}