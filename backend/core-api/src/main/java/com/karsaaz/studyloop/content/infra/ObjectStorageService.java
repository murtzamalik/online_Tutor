package com.karsaaz.studyloop.content.infra;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Filesystem-backed object store with optional MinIO mirror.
 * Keys look like {@code past-papers/GCSE-AQA-8462/JUN2024/8462_1H/paper.pdf}.
 */
@Service
public class ObjectStorageService {
  private static final Logger log = LoggerFactory.getLogger(ObjectStorageService.class);

  private final Path localRoot;
  private final String bucket;
  private final String minioEndpoint;
  private final String accessKey;
  private final String secretKey;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  public ObjectStorageService(
      @Value("${studyloop.object-storage.local-root:${user.dir}/../../data/past_papers/object_store}")
          String localRoot,
      @Value("${studyloop.object-storage.bucket:past-papers}") String bucket,
      @Value("${MINIO_ENDPOINT:}") String minioEndpoint,
      @Value("${MINIO_ACCESS_KEY:minio}") String accessKey,
      @Value("${MINIO_SECRET_KEY:minio_change_me}") String secretKey) {
    this.localRoot = Path.of(localRoot).toAbsolutePath().normalize();
    this.bucket = bucket;
    this.minioEndpoint = minioEndpoint == null ? "" : minioEndpoint.trim();
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    try {
      Files.createDirectories(this.localRoot);
    } catch (IOException e) {
      throw new IllegalStateException("Cannot create object storage root " + this.localRoot, e);
    }
  }

  public Path resolveLocal(String key) {
    Path resolved = localRoot.resolve(sanitize(key)).normalize();
    if (!resolved.startsWith(localRoot)) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid object key");
    }
    return resolved;
  }

  public boolean exists(String key) {
    if (key == null || key.isBlank()) {
      return false;
    }
    return Files.isRegularFile(resolveLocal(key));
  }

  public void putLocal(String key, Path source) {
    try {
      Path dest = resolveLocal(key);
      Files.createDirectories(dest.getParent());
      Files.copy(source, dest, StandardCopyOption.REPLACE_EXISTING);
      mirrorToMinio(key, dest);
    } catch (IOException e) {
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED, "Failed to store object: " + e.getMessage());
    }
  }

  public void putLocal(String key, InputStream in) {
    try {
      Path dest = resolveLocal(key);
      Files.createDirectories(dest.getParent());
      Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
      mirrorToMinio(key, dest);
    } catch (IOException e) {
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED, "Failed to store object: " + e.getMessage());
    }
  }

  /** Removes the local copy; returns false when it was already gone. MinIO mirrors are not purged here. */
  public boolean delete(String key) {
    try {
      return Files.deleteIfExists(resolveLocal(key));
    } catch (IOException e) {
      log.warn("Object delete failed for {}: {}", key, e.toString());
      return false;
    }
  }

  public void requireExists(String key) {
    if (!exists(key)) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Missing object: " + key);
    }
  }

  public Path requireLocalPath(String key) {
    requireExists(key);
    return resolveLocal(key);
  }

  public byte[] readBytes(String key) {
    try {
      return Files.readAllBytes(requireLocalPath(key));
    } catch (IOException e) {
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED, "Failed to read object: " + e.getMessage());
    }
  }

  private void mirrorToMinio(String key, Path localFile) {
    if (minioEndpoint.isBlank()) {
      return;
    }
    try {
      String base = minioEndpoint.replaceAll("/$", "");
      String basic = Base64.getEncoder().encodeToString((accessKey + ":" + secretKey).getBytes());
      HttpRequest mkBucket =
          HttpRequest.newBuilder(URI.create(base + "/" + bucket))
              .timeout(Duration.ofSeconds(10))
              .header("Authorization", "Basic " + basic)
              .PUT(HttpRequest.BodyPublishers.noBody())
              .build();
      http.send(mkBucket, HttpResponse.BodyHandlers.discarding());

      byte[] body = Files.readAllBytes(localFile);
      HttpRequest put =
          HttpRequest.newBuilder(URI.create(base + "/" + bucket + "/" + sanitize(key)))
              .timeout(Duration.ofSeconds(60))
              .header("Authorization", "AWS " + accessKey + ":" + secretKey)
              .header("Content-Type", "application/pdf")
              .PUT(HttpRequest.BodyPublishers.ofByteArray(body))
              .build();
      HttpResponse<String> resp = http.send(put, HttpResponse.BodyHandlers.ofString());
      if (resp.statusCode() >= 300) {
        log.warn(
            "MinIO mirror skipped/failed for {} status={} body={}",
            key,
            resp.statusCode(),
            truncate(resp.body()));
      }
    } catch (Exception e) {
      log.warn("MinIO mirror failed for {}: {}", key, e.toString());
    }
  }

  private static String sanitize(String key) {
    String k = key.replace('\\', '/').replaceAll("^/+", "");
    if (k.contains("..")) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid object key");
    }
    return k;
  }

  private static String truncate(String s) {
    if (s == null) {
      return "";
    }
    return s.length() > 200 ? s.substring(0, 200) : s;
  }
}
