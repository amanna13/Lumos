package fi.lumos.javabackend.services;

import org.springframework.stereotype.Service;
import org.stellar.sdk.*;
import org.stellar.sdk.operations.PaymentOperation;
import org.stellar.sdk.responses.AccountResponse;
import org.stellar.sdk.responses.SubmitTransactionAsyncResponse;

import java.io.IOException;
import java.math.BigDecimal;

@Service
public class PaymentTransactionService {
    private final Server server;
    private final Network network;
    private final KeyPair issuerKeyPair;

    public PaymentTransactionService(){
        this.server = new Server("https://horizon-testnet.stellar.org");
        this.network = Network.TESTNET;

        String issuerSecretKey = "";
        this.issuerKeyPair = KeyPair.fromSecretSeed(issuerSecretKey);

    }

    public String sendXlm(String destinationAddress, String amount) throws IOException {
        AccountResponse issuerAccount = server.accounts().account(issuerKeyPair.getAccountId());

        PaymentOperation paymentOperation = PaymentOperation.builder()
                .destination(destinationAddress)
                .asset(new AssetTypeNative()) // XLM Native Asset
                .amount(new BigDecimal(amount)) // BigDecimal now
                .build();

        Transaction transaction = new TransactionBuilder(issuerAccount, network)
                .addOperation(paymentOperation)
                .setTimeout(300)
                .setBaseFee(Transaction.MIN_BASE_FEE)
                .build();

        transaction.sign(issuerKeyPair);

        try {
            SubmitTransactionAsyncResponse response = server.submitTransactionAsync(transaction);
            return "Success" + response.toString();
        } catch (Exception e) {
            return  "Something went wrong ! Error Code - " + e.getMessage();
        }

    }
}
