package com.melissa.chat_BackEnd.controller;

import com.melissa.chat_BackEnd.model.ChatMessage;
import com.melissa.chat_BackEnd.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

@Controller
public class ChatController {

    private Set<String> usuariosConectados = new CopyOnWriteArraySet<>();

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    @Autowired
    private ChatMessageRepository mensajeRepository;

    @GetMapping("/api/historial")
    @ResponseBody
    public List<ChatMessage> obtenerHistorial() {
        return mensajeRepository.findAll();
    }

    @MessageMapping("/chat.enviar")
    @SendTo("/topic/public")
    public ChatMessage enviarMensaje(ChatMessage mensaje) {
        mensaje.setDestinatario("General");
        mensaje.setEstado("ENVIADO");
        mensajeRepository.save(mensaje);
        return mensaje;
    }

    @MessageMapping("/chat.privado")
    public void enviarMensajePrivado(ChatMessage mensaje) {
        mensaje.setEstado("ENVIADO");
        mensajeRepository.save(mensaje);
        messagingTemplate.convertAndSend("/topic/privado." + mensaje.getDestinatario(), mensaje);
        // Ya no nos lo enviamos a nosotros mismos porque React lo hace instantáneo para el "reloj"
    }

    // ¡NUEVO! Actualiza el tick en la BD y avisa al que lo envió
    @MessageMapping("/chat.actualizarEstado")
    public void actualizarEstado(ChatMessage mensajeActualizado) {
        ChatMessage mensajeBD = mensajeRepository.findByIdMensaje(mensajeActualizado.getIdMensaje());
        if (mensajeBD != null) {
            mensajeBD.setEstado(mensajeActualizado.getEstado());
            mensajeRepository.save(mensajeBD);
            // Le mandamos la actualización al remitente original para que su tick cambie de color
            messagingTemplate.convertAndSend("/topic/privado." + mensajeBD.getRemitente(), mensajeBD);
        }
    }

    @MessageMapping("/chat.registrar")
    @SendTo("/topic/usuarios")
    public Set<String> registrarUsuario(String username, SimpMessageHeaderAccessor headerAccessor) {
        headerAccessor.getSessionAttributes().put("username", username);
        usuariosConectados.add(username);
        return usuariosConectados;
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        if (username != null) {
            usuariosConectados.remove(username);
            messagingTemplate.convertAndSend("/topic/usuarios", usuariosConectados);
        }
    }
}