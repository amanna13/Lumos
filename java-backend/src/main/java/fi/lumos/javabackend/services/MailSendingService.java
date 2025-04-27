package fi.lumos.javabackend.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailSendingService {

    @Autowired
    public  JavaMailSender javaMailSender;

    public void sendMail(String to, String recipientName, String projectTitle, String amountCredited, String walletAddress, String transactionId) {

    String subject = "\uD83C\uDF89 Congratulations! Your Project Has Been Funded by LUMOS ";

    String body = String.format("""
    Hey %s! 👋
    
    Guess what? Your project "%s" just made it through! 🎯  
    After all the votes and reviews, you’ve officially secured your grant. 🎉
    
    We’ve sent %s XLM straight to your Stellar wallet.  
    Check out the details below:
    
    Project: %s  
    Amount: %s XLM  
    Wallet: %s  
    Transaction ID: %s
    
    This is just the beginning — we’re hyped to see what you build next. 🔥  
    LUMOS is backing you all the way!  
    
    Need anything? Hit us up at support@lumos.org.  
    (We’re super quick with replies — no corporate vibes, promise. 😉)
    
    — Team LUMOS  
    www.lumos.org
    """,
    recipientName, projectTitle, amountCredited, projectTitle, amountCredited, walletAddress, transactionId
        );

        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(to);
            mail.setSubject(subject);
            mail.setText(body);
            javaMailSender.send(mail);
        } catch (Exception e) {
            System.out.println("Error sending mail to " + e.getMessage());
        }
    }
}
