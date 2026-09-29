package com.karsaaz.studyloop.identity.infra;

import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SecretBox {
  private final byte[] key;
  private final SecureRandom random = new SecureRandom();

  public SecretBox(@Value("${studyloop.aes-data-key-hex}") String hexKey) {
    this.key = HexFormat.of().parseHex(hexKey);
    if (key.length != 32) {
      throw new IllegalStateException("AES_DATA_KEY must be 32 bytes hex");
    }
  }

  public byte[] encrypt(byte[] plaintext) {
    try {
      byte[] iv = new byte[12];
      random.nextBytes(iv);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
      byte[] ct = cipher.doFinal(plaintext);
      return ByteBuffer.allocate(iv.length + ct.length).put(iv).put(ct).array();
    } catch (Exception e) {
      throw new IllegalStateException("encrypt failed", e);
    }
  }

  public byte[] decrypt(byte[] blob) {
    try {
      ByteBuffer buf = ByteBuffer.wrap(blob);
      byte[] iv = new byte[12];
      buf.get(iv);
      byte[] ct = new byte[buf.remaining()];
      buf.get(ct);
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
      return cipher.doFinal(ct);
    } catch (Exception e) {
      throw new IllegalStateException("decrypt failed", e);
    }
  }
}
