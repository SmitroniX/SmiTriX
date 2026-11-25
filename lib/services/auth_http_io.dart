import 'dart:convert';
import 'dart:io';

import 'auth_http.dart';

Future<AuthHttpReply> send(
  String method,
  String url, {
  Map<String, String> headers = const {},
  String? body,
}) async {
  final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
  try {
    final req = await client.openUrl(method, Uri.parse(url));
    headers.forEach((k, v) => req.headers.set(k, v));
    if (body != null) {
      final bytes = utf8.encode(body);
      req.headers.set(HttpHeaders.contentLengthHeader, bytes.length.toString());
      req.add(bytes);
    }
    final res = await req.close().timeout(const Duration(seconds: 20));
    final text = await res.transform(utf8.decoder).join();
    return AuthHttpReply(res.statusCode, text);
  } catch (_) {
    return const AuthHttpReply(0, '');
  } finally {
    client.close(force: true);
  }
}
