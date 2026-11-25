import 'auth_http_io.dart' if (dart.library.js_interop) 'auth_http_web.dart' as impl;

class AuthHttpReply {
  const AuthHttpReply(this.status, this.body);
  final int status;
  final String body;

  bool get ok => status >= 200 && status < 300;
}

Future<AuthHttpReply> authHttpRequest(
  String method,
  String url, {
  Map<String, String> headers = const {},
  String? body,
}) =>
    impl.send(method, url, headers: headers, body: body);
