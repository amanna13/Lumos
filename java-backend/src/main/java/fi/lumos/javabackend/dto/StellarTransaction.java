package fi.lumos.javabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StellarTransaction {
    private String recipient;
    private String amount;
    private String recipientMail;
    private String recipientName;
    private String projectTitle;
}
