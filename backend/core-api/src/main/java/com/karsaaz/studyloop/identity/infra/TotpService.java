package com.karsaaz.studyloop.identity.infra;

import java.nio.ByteBuffer;
import java.security.SecureRandom;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.codec.binary.Base32;
import org.springframework.stereotype.Service;

@Service
public class TotpService {
  private final SecureRandom random = new SecureRandom();
  private final Base32 base32 = new Base32();

  public String generateSecret() {
    byte[] buf = new byte[20];
    random.nextBytes(buf);
    return base32.encodeToString(buf).replace("=", "");
  }

  public String otpAuthUri(String email, String secret) {
    return "otpauth://totp/StudyLoop:" + email + "?secret=" + secret + "&issuer=StudyLoop&digits=6&period=30";
  }

  public boolean verify(String secret, String code) {
    if (code == null || !code.matches("\\d{6}")) {
      return false;
    }
    long timestep = System.currentTimeMillis() / 1000L / 30L;
    for (long i = -1; i <= 1; i++) {
      if (code.equals(generateCode(secret, timestep + i))) {
        return true;
      }
    }
    return false;
  }

  private String generateCode(String secret, long timestep) {
    try {
      byte[] key = base32.decode(secret);
      byte[] data = ByteBuffer.allocate(8).putLong(timestep).array();
      Mac mac = Mac.getInstance("HmacSHA1");
      mac.init(new SecretKeySpec(key, "HmacSHA1"));
      byte[] hash = mac.doFinal(data);
      int offset = hash[hash.length - 1] & 0x0F;
      int binary = ((hash[offset] & 0x7f) << 24)
          | ((hash[offset + 1] & 0xff) << 16)
          | ((hash[offset + 2] & 0xff) << 8)
          | (hash[offset + 3] & 0xff);
      int otp = binary % 1_000_000;
      return String.format("%06d", otp);
    } catch (Exception e) {
      throw new IllegalStateException("TOTP failure", e);
    }
  }
}
