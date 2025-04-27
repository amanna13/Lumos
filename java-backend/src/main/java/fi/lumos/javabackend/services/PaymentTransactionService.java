package fi.lumos.javabackend.services;

import fi.lumos.javabackend.dto.StellarTransaction;
import fi.lumos.javabackend.dto.TransactionResponseDTO;
import fi.lumos.javabackend.utilites.StellarAmountFormatter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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


//    @Value("${app.security.issuerSecretKey}")
//    public void setSecretKey(String SECRET_KEY){
//        PaymentTransactionService.issuerSecretKey = SECRET_KEY;
//    }
    @Autowired
    public PaymentTransactionService(@Value("${app.security.issuerSecretKey}") String issuerSecretKey){
        this.server = new Server("https://horizon-testnet.stellar.org");
        this.network = Network.TESTNET;

        this.issuerKeyPair = KeyPair.fromSecretSeed(issuerSecretKey);

    }

    @Autowired
    public MailSendingService mailSendingService;

    public TransactionResponseDTO sendXlm(StellarTransaction stellarTransaction) throws IOException {
        AccountResponse issuerAccount = server.accounts().account(issuerKeyPair.getAccountId());

        String amount = StellarAmountFormatter.format(stellarTransaction.getAmount());

        PaymentOperation paymentOperation = PaymentOperation.builder()
                .destination(stellarTransaction.getRecipient())
                .asset(new AssetTypeNative()) // XLM Native Asset
                .amount(new BigDecimal(amount)) // BigDecimal now
                .build();

        Transaction transaction = new TransactionBuilder(issuerAccount, network)
                .addOperation(paymentOperation)
                .setTimeout(300)
                .setBaseFee(Transaction.MIN_BASE_FEE)
                .build();

        transaction.sign(issuerKeyPair);

        TransactionResponseDTO responseDTO = new TransactionResponseDTO();

        try {
            SubmitTransactionAsyncResponse response = server.submitTransactionAsync(transaction);
            String transactionHash = response.getHash();
            String transactionStatus = response.getTxStatus().toString();
            responseDTO.setTransactionHash(transactionHash);
            responseDTO.setStatus(transactionStatus);

            mailSendingService.sendMail(
                    stellarTransaction.getRecipientMail(),
                    stellarTransaction.getRecipientName(),
                    stellarTransaction.getProjectTitle(),
                    stellarTransaction.getAmount(),
                    stellarTransaction.getRecipient(),
                    transactionHash
            );

            responseDTO.setMailSent(true);
            return responseDTO;
        } catch (Exception e) {
            responseDTO.setStatus("ERROR");
            responseDTO.setTransactionHash("N/A");
            responseDTO.setMailSent(false);
            return responseDTO;
        }

    }

    public String getWalletBalance(String publicKey) throws IOException {
        Server server = new Server("https://horizon-testnet.stellar.org");
        AccountResponse account = server.accounts().account(publicKey);
        StringBuilder balances = new StringBuilder();
        for (AccountResponse.Balance balance : account.getBalances()) {
            balances.append(String.format("Type: %s, Balance: %s\n", balance.getAssetType(), balance.getBalance()));
        }
        return balances.toString();
    }


}
