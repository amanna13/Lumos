package fi.lumos.javabackend.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class WebSocketProgressSender {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public WebSocketProgressSender(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendProgress(int percentage) {
        messagingTemplate.convertAndSend("/topic/progress", percentage);
    }

}

