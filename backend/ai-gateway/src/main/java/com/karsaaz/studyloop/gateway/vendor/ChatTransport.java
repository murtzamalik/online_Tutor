package com.karsaaz.studyloop.gateway.vendor;

import java.util.List;

/** One chat completion against a vendor. No prompt logic, no parsing of the model's JSON. */
public interface ChatTransport {

  /** Value of {@code model_routing.vendor} this transport serves. */
  String vendor();

  boolean isConfigured();

  /**
   * @param imagesBase64 raw base64 or data-URL images; empty for text-only prompts
   * @throws VendorCallException on HTTP or network failure
   */
  VendorReply complete(
      String model,
      String system,
      String user,
      List<String> imagesBase64,
      double temperature,
      int maxTokens);

  record VendorReply(String text, Integer tokensIn, Integer tokensOut) {}

  /** HTTP status 0 means the vendor could not be reached (timeout, DNS, refused). */
  class VendorCallException extends RuntimeException {
    private final int status;

    public VendorCallException(int status, String message, Throwable cause) {
      super(message, cause);
      this.status = status;
    }

    public int status() {
      return status;
    }

    /**
     * Worth trying the fallback model: auth/quota/server/network problems and unparseable output
     * (422), not bad requests.
     */
    public boolean fallbackEligible() {
      return status == 0 || status == 401 || status == 403 || status == 408 || status == 422 || status == 429 || status >= 500;
    }
  }

  /** Media type and bare base64 payload of an image given as raw base64 or a data URL. */
  static String[] splitImage(String b64) {
    String media = b64.startsWith("/9j/") ? "image/jpeg" : "image/png";
    String data = b64;
    if (b64.startsWith("data:")) {
      int comma = b64.indexOf(',');
      if (comma > 0) {
        String header = b64.substring(5, comma);
        media = header.contains("jpeg") || header.contains("jpg") ? "image/jpeg" : "image/png";
        data = b64.substring(comma + 1);
      }
    }
    return new String[] {media, data};
  }
}
