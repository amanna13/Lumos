package fi.lumos.javabackend.controller;

import fi.lumos.javabackend.dto.StellarTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/transaction")
public class PaymentTransactionController {


//    @Autowired
//    PaymentTransactionService paymentTransactionService;


//    @PostMapping("/send")
//    public ResponseEntity<String> sendXLM(@RequestBody StellarTransaction transaction) throws IOException {
//        String recipientAddress = transaction.getRecipient();
//        String amount = transaction.getAmount();
//        String result = paymentTransactionService.sendXlm(recipientAddress, amount);
//        return new ResponseEntity<>(result, HttpStatus.OK);
//    }



}
