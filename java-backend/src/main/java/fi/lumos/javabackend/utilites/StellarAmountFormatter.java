package fi.lumos.javabackend.utilites;

import java.math.BigDecimal;
import java.text.DecimalFormat;

public class StellarAmountFormatter {
    private static final DecimalFormat decimalFormat = new DecimalFormat("0.0000000");

    public static String format(String amount) {
        return decimalFormat.format(new BigDecimal(amount));
    }
}
