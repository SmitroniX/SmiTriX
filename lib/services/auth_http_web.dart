import 'dart:js_interop';

import 'package:web/web.dart' as web;

import 'auth_http.dart';

Future<AuthHttpReply> send(
  String method,
  String url, {
  Map<String, String> headers = const {},
  String? body,
}) async {
  try {
    final h = web.Headers();
    headers.forEach((k, v) => h.append(k, v));
    final res = await web.window
        .fetch(
          url.toJS,
          web.RequestInit(
            method: method,
            headers: h,
            body: body?.toJS,
            cache: 'no-store',
          ),
        )
        .toDart;
    final text = (await res.text().toDart).toDart;
    return AuthHttpReply(res.status, text);
  } catch (_) {
    return const AuthHttpReply(0, '');
  }
}
