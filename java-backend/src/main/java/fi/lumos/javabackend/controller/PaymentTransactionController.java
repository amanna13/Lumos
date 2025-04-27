package fi.lumos.javabackend.controller;

import fi.lumos.javabackend.dto.StellarTransaction;
import fi.lumos.javabackend.dto.TransactionResponseDTO;
import fi.lumos.javabackend.services.PaymentTransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/transaction")
public class PaymentTransactionController {

    @Autowired
    PaymentTransactionService paymentTransactionService;


    @PostMapping("/send")
    public ResponseEntity<TransactionResponseDTO> sendXLM(@RequestBody StellarTransaction transactionDTO) throws IOException {

        TransactionResponseDTO responseDTO = paymentTransactionService.sendXlm(transactionDTO);
        return new ResponseEntity<>(responseDTO, HttpStatus.OK);
    }

    @GetMapping("/check-balance")
    public String checkBalance(@RequestParam String publicKey) throws IOException {
        return paymentTransactionService.getWalletBalance(publicKey);

    }

}
