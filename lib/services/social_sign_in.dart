import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

/// OAuth client config, injected at build time with --dart-define (never committed).
const kGoogleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
const kGoogleIosClientId = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');
const kAppleServiceId = String.fromEnvironment('APPLE_SERVICE_ID');
const kAppleRedirectUri = String.fromEnvironment('APPLE_REDIRECT_URI');

/// Marker returned when the user closes the provider sheet: no error banner.
const kAuthCancelled = '__cancelled__';

class SocialToken {
  const SocialToken({required this.providerId, required this.idToken, this.rawNonce, this.displayName = ''});

  final String providerId;
  final String idToken;
  final String? rawNonce;
  final String displayName;
}

typedef SocialResult = ({SocialToken? token, String? error});

bool get _isApple =>
    !kIsWeb && (defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS);

bool get googleSignInConfigured => _isApple ? kGoogleIosClientId.isNotEmpty : kGoogleServerClientId.isNotEmpty;

bool get appleSignInConfigured => _isApple || (kAppleServiceId.isNotEmpty && kAppleRedirectUri.isNotEmpty);

Future<void>? _googleInit;

Future<SocialResult> fetchGoogleToken() async {
  if (!googleSignInConfigured) {
    return (token: null, error: 'Google sign-in is not configured in this build yet.');
  }
  try {
    final google = GoogleSignIn.instance;
    _googleInit ??= google.initialize(
      clientId: _isApple ? kGoogleIosClientId : null,
      serverClientId: kGoogleServerClientId.isEmpty ? null : kGoogleServerClientId,
    );
    await _googleInit;
    if (!google.supportsAuthenticate()) {
      return (token: null, error: 'Google sign-in is not supported on this device.');
    }
    final account = await google.authenticate(scopeHint: const ['email']);
    final idToken = account.authentication.idToken;
    if (idToken == null || idToken.isEmpty) {
      return (token: null, error: 'Google did not return an identity token.');
    }
    return (
      token: SocialToken(providerId: 'google.com', idToken: idToken, displayName: account.displayName ?? ''),
      error: null,
    );
  } on GoogleSignInException catch (e) {
    if (e.code == GoogleSignInExceptionCode.canceled) return (token: null, error: kAuthCancelled);
    return (token: null, error: 'Google sign-in failed. Please try again.');
  } catch (_) {
    return (token: null, error: 'Google sign-in failed. Please try again.');
  }
}

Future<SocialResult> fetchAppleToken() async {
  if (!appleSignInConfigured) {
    return (token: null, error: 'Apple sign-in is not configured in this build yet.');
  }
  try {
    final rawNonce = _nonce();
    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: const [AppleIDAuthorizationScopes.email, AppleIDAuthorizationScopes.fullName],
      nonce: sha256.convert(utf8.encode(rawNonce)).toString(),
      webAuthenticationOptions: _isApple
          ? null
          : WebAuthenticationOptions(clientId: kAppleServiceId, redirectUri: Uri.parse(kAppleRedirectUri)),
    );
    final idToken = credential.identityToken;
    if (idToken == null || idToken.isEmpty) {
      return (token: null, error: 'Apple did not return an identity token.');
    }
    final name = [credential.givenName, credential.familyName].whereType<String>().join(' ').trim();
    return (
      token: SocialToken(providerId: 'apple.com', idToken: idToken, rawNonce: rawNonce, displayName: name),
      error: null,
    );
  } on SignInWithAppleAuthorizationException catch (e) {
    if (e.code == AuthorizationErrorCode.canceled) return (token: null, error: kAuthCancelled);
    return (token: null, error: 'Apple sign-in failed. Please try again.');
  } catch (_) {
    return (token: null, error: 'Apple sign-in failed. Please try again.');
  }
}

Future<void> signOutSocial() async {
  if (_googleInit == null) return;
  try {
    await GoogleSignIn.instance.signOut();
  } catch (_) {}
}

String _nonce([int length = 32]) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  final random = Random.secure();
  return List.generate(length, (_) => chars[random.nextInt(chars.length)]).join();
}
