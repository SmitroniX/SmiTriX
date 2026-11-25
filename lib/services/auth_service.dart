import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_http.dart';
import 'local_store.dart';
import 'social_sign_in.dart';

export 'social_sign_in.dart' show kAuthCancelled, SocialToken, googleSignInConfigured, appleSignInConfigured;

const kFirebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
const kFirebaseProjectId = String.fromEnvironment(
  'FIREBASE_PROJECT_ID',
  defaultValue: 'aniplex-b74b5',
);
const kAdminEmail = 'smitronix0826@gmail.com';
const kWebDemo = bool.fromEnvironment('DEMO');

class AuthUser {
  const AuthUser({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.idToken,
    required this.refreshToken,
    required this.expiresAtMs,
    this.isGuest = false,
  });

  final String uid;
  final String email;
  final String displayName;
  final String idToken;
  final String refreshToken;
  final int expiresAtMs;
  final bool isGuest;

  bool get isAdmin => !isGuest && email.trim().toLowerCase() == kAdminEmail;

  bool get isSignedIn => !isGuest && uid.isNotEmpty && idToken.isNotEmpty;

  bool get isTokenExpired => expiresAtMs <= DateTime.now().millisecondsSinceEpoch + 60000;

  String get label {
    final name = displayName.trim();
    if (name.isNotEmpty) return name;
    final mail = email.trim();
    if (mail.contains('@')) return mail.split('@').first;
    return isGuest ? 'Offline Athlete' : 'Athlete';
  }

  String get initials {
    final parts = label.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'ST';
    if (parts.length == 1) {
      final s = parts.first;
      return s.substring(0, s.length >= 2 ? 2 : 1).toUpperCase();
    }
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }

  AuthUser copyWith({
    String? uid,
    String? email,
    String? displayName,
    String? idToken,
    String? refreshToken,
    int? expiresAtMs,
    bool? isGuest,
  }) =>
      AuthUser(
        uid: uid ?? this.uid,
        email: email ?? this.email,
        displayName: displayName ?? this.displayName,
        idToken: idToken ?? this.idToken,
        refreshToken: refreshToken ?? this.refreshToken,
        expiresAtMs: expiresAtMs ?? this.expiresAtMs,
        isGuest: isGuest ?? this.isGuest,
      );

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'idToken': idToken,
        'refreshToken': refreshToken,
        'expiresAtMs': expiresAtMs,
        'isGuest': isGuest,
      };

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        uid: (j['uid'] as String?) ?? '',
        email: (j['email'] as String?) ?? '',
        displayName: (j['displayName'] as String?) ?? '',
        idToken: (j['idToken'] as String?) ?? '',
        refreshToken: (j['refreshToken'] as String?) ?? '',
        expiresAtMs: (j['expiresAtMs'] as num?)?.toInt() ?? 0,
        isGuest: j['isGuest'] == true,
      );
}

class AuthService extends ChangeNotifier {
  AuthService._();

  static final AuthService instance = AuthService._();

  static const _prefsKey = 'smitrix_auth_user_v1';
  static const _lastSyncKey = 'smitrix_last_sync_v1';

  AuthUser? _user;
  DateTime? _lastSyncAt;
  bool _busy = false;
  SharedPreferences? _prefs;

  @visibleForTesting
  bool? forceRequireLoginForTest;

  AuthUser? get user => _user;

  DateTime? get lastSyncAt => _lastSyncAt;

  bool get busy => _busy;

  bool get isConfigured => kFirebaseApiKey.isNotEmpty;

  bool get isSignedIn => _user?.isSignedIn == true;

  bool get isGuest => _user?.isGuest == true;

  bool get _isTestEnv {
    try {
      return WidgetsBinding.instance.runtimeType.toString().contains('Test');
    } catch (_) {
      return true;
    }
  }

  /// Login is strictly for the native mobile app — NEVER on web or live demo.
  bool get requiresLogin {
    if (kIsWeb || kWebDemo) return false;
    if (forceRequireLoginForTest != null) {
      return forceRequireLoginForTest! && _user == null;
    }
    if (_isTestEnv) return false;
    return _user == null;
  }

  Future<void> init() async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
      final raw = _prefs?.getString(_prefsKey);
      if (raw != null && raw.isNotEmpty) {
        final map = jsonDecode(raw);
        if (map is Map<String, dynamic>) {
          final parsed = AuthUser.fromJson(map);
          if (parsed.isGuest || parsed.uid.isNotEmpty) {
            _user = parsed;
          }
        }
      }
      final syncIso = _prefs?.getString(_lastSyncKey);
      if (syncIso != null && syncIso.isNotEmpty) {
        _lastSyncAt = DateTime.tryParse(syncIso);
      }
    } catch (_) {
      _user = null;
    }
    notifyListeners();
  }

  Future<void> _saveUser(AuthUser? next) async {
    _user = next;
    try {
      _prefs ??= await SharedPreferences.getInstance();
      if (next == null) {
        await _prefs?.remove(_prefsKey);
      } else {
        await _prefs?.setString(_prefsKey, jsonEncode(next.toJson()));
      }
    } catch (_) {}
    notifyListeners();
  }

  void _setBusy(bool value) {
    if (_busy == value) return;
    _busy = value;
    notifyListeners();
  }

  Future<String?> signIn(String email, String password) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty || !trimmed.contains('@')) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (!isConfigured) {
      return 'Cloud authentication is not configured in this build. Use offline mode to continue.';
    }
    _setBusy(true);
    try {
      final reply = await authHttpRequest(
        'POST',
        'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$kFirebaseApiKey',
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': trimmed,
          'password': password,
          'returnSecureToken': true,
        }),
      );
      final body = _decodeMap(reply.body);
      if (!reply.ok) {
        return friendlyError(_extractErrorCode(body, reply.status));
      }
      final expiresSec = int.tryParse('${body['expiresIn'] ?? '3600'}') ?? 3600;
      await _saveUser(AuthUser(
        uid: '${body['localId'] ?? ''}',
        email: '${body['email'] ?? trimmed}',
        displayName: '${body['displayName'] ?? ''}',
        idToken: '${body['idToken'] ?? ''}',
        refreshToken: '${body['refreshToken'] ?? ''}',
        expiresAtMs: DateTime.now().millisecondsSinceEpoch + expiresSec * 1000,
      ));
      return null;
    } finally {
      _setBusy(false);
    }
  }

  Future<String?> register(String name, String email, String password) async {
    final trimmedName = name.trim();
    final trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty || !trimmedEmail.contains('@')) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (!isConfigured) {
      return 'Cloud authentication is not configured in this build. Use offline mode to continue.';
    }
    _setBusy(true);
    try {
      final reply = await authHttpRequest(
        'POST',
        'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$kFirebaseApiKey',
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': trimmedEmail,
          'password': password,
          'returnSecureToken': true,
        }),
      );
      final body = _decodeMap(reply.body);
      if (!reply.ok) {
        return friendlyError(_extractErrorCode(body, reply.status));
      }
      final idToken = '${body['idToken'] ?? ''}';
      if (trimmedName.isNotEmpty && idToken.isNotEmpty) {
        await authHttpRequest(
          'POST',
          'https://identitytoolkit.googleapis.com/v1/accounts:update?key=$kFirebaseApiKey',
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'idToken': idToken,
            'displayName': trimmedName,
            'returnSecureToken': false,
          }),
        );
      }
      final expiresSec = int.tryParse('${body['expiresIn'] ?? '3600'}') ?? 3600;
      await _saveUser(AuthUser(
        uid: '${body['localId'] ?? ''}',
        email: '${body['email'] ?? trimmedEmail}',
        displayName: trimmedName,
        idToken: idToken,
        refreshToken: '${body['refreshToken'] ?? ''}',
        expiresAtMs: DateTime.now().millisecondsSinceEpoch + expiresSec * 1000,
      ));
      return null;
    } finally {
      _setBusy(false);
    }
  }

  Future<String?> sendPasswordReset(String email) async {
    final trimmed = email.trim();
    if (trimmed.isEmpty || !trimmed.contains('@')) {
      return 'Please enter your email address.';
    }
    if (!isConfigured) {
      return 'Password reset is unavailable in offline builds.';
    }
    _setBusy(true);
    try {
      final reply = await authHttpRequest(
        'POST',
        'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=$kFirebaseApiKey',
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requestType': 'PASSWORD_RESET',
          'email': trimmed,
        }),
      );
      if (!reply.ok) {
        return friendlyError(_extractErrorCode(_decodeMap(reply.body), reply.status));
      }
      return null;
    } finally {
      _setBusy(false);
    }
  }

  /// Which social provider is currently in flight ('google.com' / 'apple.com'), for button spinners.
  String? _socialBusy;
  String? get socialBusy => _socialBusy;

  Future<String?> signInWithGoogle() => _signInWithProvider('google.com', fetchGoogleToken);

  Future<String?> signInWithApple() => _signInWithProvider('apple.com', fetchAppleToken);

  Future<String?> _signInWithProvider(String providerId, Future<SocialResult> Function() fetch) async {
    if (_busy) return null;
    if (!isConfigured) {
      return 'Cloud authentication is not configured in this build. Use offline mode to continue.';
    }
    _socialBusy = providerId;
    _setBusy(true);
    try {
      final res = await fetch();
      final token = res.token;
      if (token == null) return res.error ?? kAuthCancelled;
      return await signInWithIdp(token);
    } finally {
      _socialBusy = null;
      _setBusy(false);
    }
  }

  /// Exchanges a Google / Apple identity token for a Firebase session.
  Future<String?> signInWithIdp(SocialToken token) async {
    final post = StringBuffer('id_token=${Uri.encodeQueryComponent(token.idToken)}'
        '&providerId=${Uri.encodeQueryComponent(token.providerId)}');
    if (token.rawNonce != null) post.write('&nonce=${Uri.encodeQueryComponent(token.rawNonce!)}');
    final reply = await authHttpRequest(
      'POST',
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=$kFirebaseApiKey',
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({
        'postBody': post.toString(),
        'requestUri': 'https://$kFirebaseProjectId.firebaseapp.com/__/auth/handler',
        'returnIdpCredential': true,
        'returnSecureToken': true,
      }),
    );
    final body = _decodeMap(reply.body);
    if (!reply.ok) return friendlyError(_extractErrorCode(body, reply.status));
    if (body['needConfirmation'] == true) return friendlyError('NEED_CONFIRMATION');

    final idToken = '${body['idToken'] ?? ''}';
    var displayName = '${body['displayName'] ?? ''}'.trim();
    if (displayName.isEmpty && token.displayName.isNotEmpty) {
      displayName = token.displayName;
      await authHttpRequest(
        'POST',
        'https://identitytoolkit.googleapis.com/v1/accounts:update?key=$kFirebaseApiKey',
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken, 'displayName': displayName, 'returnSecureToken': false}),
      );
    }
    final expiresSec = int.tryParse('${body['expiresIn'] ?? '3600'}') ?? 3600;
    await _saveUser(AuthUser(
      uid: '${body['localId'] ?? ''}',
      email: '${body['email'] ?? ''}',
      displayName: displayName,
      idToken: idToken,
      refreshToken: '${body['refreshToken'] ?? ''}',
      expiresAtMs: DateTime.now().millisecondsSinceEpoch + expiresSec * 1000,
    ));
    return null;
  }

  Future<void> continueOffline({String name = ''}) async {
    await _saveUser(AuthUser(
      uid: 'offline',
      email: '',
      displayName: name.trim(),
      idToken: '',
      refreshToken: '',
      expiresAtMs: 0,
      isGuest: true,
    ));
  }

  Future<void> signOut() async {
    if (!kIsWeb) await signOutSocial();
    await _saveUser(null);
  }

  Future<bool> refreshTokenIfNeeded() async {
    final u = _user;
    if (u == null || !u.isSignedIn) return false;
    if (!u.isTokenExpired) return true;
    if (u.refreshToken.isEmpty || !isConfigured) return false;
    final reply = await authHttpRequest(
      'POST',
      'https://securetoken.googleapis.com/v1/token?key=$kFirebaseApiKey',
      headers: const {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'grant_type=refresh_token&refresh_token=${Uri.encodeQueryComponent(u.refreshToken)}',
    );
    if (!reply.ok) return false;
    final body = _decodeMap(reply.body);
    final newId = '${body['id_token'] ?? ''}';
    if (newId.isEmpty) return false;
    final newRefresh = '${body['refresh_token'] ?? u.refreshToken}';
    final expiresSec = int.tryParse('${body['expires_in'] ?? '3600'}') ?? 3600;
    await _saveUser(u.copyWith(
      idToken: newId,
      refreshToken: newRefresh,
      expiresAtMs: DateTime.now().millisecondsSinceEpoch + expiresSec * 1000,
    ));
    return true;
  }

  String _backupDocUrl(String uid) =>
      'https://firestore.googleapis.com/v1/projects/$kFirebaseProjectId'
      '/databases/(default)/documents/users/$uid/data/smitrix_backup';

  Future<String?> pushCloudBackup(Map<String, dynamic> state) async {
    final u = _user;
    if (u == null || !u.isSignedIn) return 'Sign in to sync with cloud.';
    if (!await refreshTokenIfNeeded()) {
      return 'Session expired. Please sign in again.';
    }
    final active = _user!;
    _setBusy(true);
    try {
      final now = DateTime.now().toUtc();
      final payload = Store.encode(state);
      final reply = await authHttpRequest(
        'PATCH',
        _backupDocUrl(active.uid),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${active.idToken}',
        },
        body: jsonEncode({
          'fields': {
            'payload': {'stringValue': payload},
            'updatedAt': {'stringValue': now.toIso8601String()},
            'appVersion': {'stringValue': '3.0.1'},
          },
        }),
      );
      if (!reply.ok) {
        return reply.status == 0
            ? 'No internet connection.'
            : 'Cloud sync failed (HTTP ${reply.status}).';
      }
      _lastSyncAt = now.toLocal();
      try {
        _prefs ??= await SharedPreferences.getInstance();
        await _prefs?.setString(_lastSyncKey, _lastSyncAt!.toIso8601String());
      } catch (_) {}
      notifyListeners();
      return null;
    } finally {
      _setBusy(false);
    }
  }

  Future<({Map<String, dynamic>? data, String? error})> pullCloudBackup() async {
    final u = _user;
    if (u == null || !u.isSignedIn) {
      return (data: null, error: 'Sign in to restore from cloud.');
    }
    if (!await refreshTokenIfNeeded()) {
      return (data: null, error: 'Session expired. Please sign in again.');
    }
    final active = _user!;
    _setBusy(true);
    try {
      final reply = await authHttpRequest(
        'GET',
        _backupDocUrl(active.uid),
        headers: {'Authorization': 'Bearer ${active.idToken}'},
      );
      if (reply.status == 404) {
        return (data: null, error: null);
      }
      if (!reply.ok) {
        return (
          data: null,
          error: reply.status == 0
              ? 'No internet connection.'
              : 'Could not read cloud backup (HTTP ${reply.status}).',
        );
      }
      final body = _decodeMap(reply.body);
      final fields = body['fields'];
      if (fields is! Map) return (data: null, error: null);
      final payloadField = fields['payload'];
      final raw = payloadField is Map ? payloadField['stringValue'] as String? : null;
      if (raw == null || raw.isEmpty) return (data: null, error: null);
      final decoded = Store.decodeState(raw);
      if (decoded.isEmpty) return (data: null, error: null);
      final updatedField = fields['updatedAt'];
      final updatedIso = updatedField is Map ? updatedField['stringValue'] as String? : null;
      if (updatedIso != null) {
        _lastSyncAt = DateTime.tryParse(updatedIso)?.toLocal() ?? DateTime.now();
        try {
          _prefs ??= await SharedPreferences.getInstance();
          await _prefs?.setString(_lastSyncKey, _lastSyncAt!.toIso8601String());
        } catch (_) {}
        notifyListeners();
      }
      return (data: decoded, error: null);
    } finally {
      _setBusy(false);
    }
  }

  static Map<String, dynamic> _decodeMap(String raw) {
    if (raw.isEmpty) return {};
    try {
      final parsed = jsonDecode(raw);
      return parsed is Map<String, dynamic> ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  static String _extractErrorCode(Map<String, dynamic> body, int status) {
    final err = body['error'];
    if (err is Map && err['message'] is String) {
      return err['message'] as String;
    }
    return status == 0 ? 'NETWORK' : 'HTTP_$status';
  }

  static String friendlyError(String raw) {
    final code = raw.split(':').first.trim().toUpperCase();
    switch (code) {
      case 'INVALID_LOGIN_CREDENTIALS':
      case 'EMAIL_NOT_FOUND':
      case 'INVALID_PASSWORD':
        return 'Incorrect email or password.';
      case 'EMAIL_EXISTS':
        return 'An account already exists with this email.';
      case 'WEAK_PASSWORD':
        return 'Password is too weak. Use at least 6 characters.';
      case 'INVALID_EMAIL':
        return 'Please enter a valid email address.';
      case 'TOO_MANY_ATTEMPTS_TRY_LATER':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'USER_DISABLED':
        return 'This account has been disabled.';
      case 'OPERATION_NOT_ALLOWED':
        return 'This sign-in method is disabled for this project.';
      case 'INVALID_IDP_RESPONSE':
        return 'The sign-in provider rejected the request. Please try again.';
      case 'NEED_CONFIRMATION':
      case 'FEDERATED_USER_ID_ALREADY_LINKED':
        return 'This email is already linked to another sign-in method. Use that method instead.';
      case 'NETWORK':
        return 'Could not reach server. Check your internet connection or continue offline.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }
}
