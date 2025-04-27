package fi.lumos.javabackend.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Data
public class TransactionResponseDTO {
    private String transactionHash;
    private String status;
    private boolean mailSent;
}
